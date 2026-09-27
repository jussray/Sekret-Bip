begin;

-- Production and clean replay currently have two reward schema lineages:
--   live:  public.rewards + reward_redemptions.user_id
--   replay: public.reward_catalog + reward_redemptions.teen_id
-- Keep one behavioral contract across both without destructive renames. This
-- migration only tightens authorization and restores linked-parent visibility.

drop policy if exists reward_redemptions_parent_select on public.reward_redemptions;
drop policy if exists reward_redemptions_linked_parent_read on public.reward_redemptions;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reward_redemptions'
      and column_name = 'user_id'
  ) then
    execute $policy$
      create policy reward_redemptions_linked_parent_read
      on public.reward_redemptions
      for select to authenticated
      using (
        public.is_non_anonymous_user()
        and exists (
          select 1
          from public.parent_links pl
          where pl.teen_user_id = reward_redemptions.user_id
            and pl.parent_user_id = (select auth.uid())
            and pl.status = 'active'
            and pl.is_active = true
        )
      )
    $policy$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reward_redemptions'
      and column_name = 'teen_id'
  ) then
    execute $policy$
      create policy reward_redemptions_linked_parent_read
      on public.reward_redemptions
      for select to authenticated
      using (
        public.is_non_anonymous_user()
        and exists (
          select 1
          from public.parent_links pl
          where pl.teen_user_id = reward_redemptions.teen_id
            and pl.parent_user_id = (select auth.uid())
            and pl.status = 'active'
            and pl.is_active = true
        )
      )
    $policy$;
  else
    raise exception 'reward_redemptions_owner_column_missing';
  end if;
end
$$;

-- Rebuild the two SECURITY DEFINER RPCs against whichever reward table lineage
-- exists. Both variants preserve the established request/review error contract.
do $$
begin
  if to_regclass('public.rewards') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'reward_redemptions'
         and column_name = 'user_id'
     ) then

    execute $sql$
      create or replace function public.request_reward_redemption(p_reward_id uuid)
      returns table(
        redemption_id uuid,
        reward_name text,
        point_cost integer,
        status text,
        available_points integer
      )
      language plpgsql
      security definer
      set search_path = public
      as $fn$
      declare
        v_user_id uuid := auth.uid();
        v_reward public.rewards%rowtype;
        v_balance integer := 0;
        v_status text;
        v_redemption_id uuid;
      begin
        if v_user_id is null then
          raise exception 'unauthorized';
        end if;
        if not public.is_non_anonymous_user() then
          raise exception 'permanent_account_required' using errcode = '42501';
        end if;

        select * into v_reward
        from public.rewards
        where id = p_reward_id
          and active = true
        for update;

        if not found then raise exception 'reward_not_found'; end if;
        if v_reward.inventory is not null and v_reward.inventory <= 0 then
          raise exception 'out_of_stock';
        end if;

        select available into v_balance
        from public.point_balances
        where user_id = v_user_id
        for update;

        v_balance := coalesce(v_balance, 0);
        if v_balance < v_reward.point_cost then raise exception 'insufficient_points'; end if;

        v_status := case when v_reward.requires_parent_approval then 'pending_parent' else 'approved' end;

        insert into public.reward_redemptions(user_id, reward_id, point_cost, status)
        values (v_user_id, v_reward.id, v_reward.point_cost, v_status)
        returning id into v_redemption_id;

        insert into public.point_transactions(
          user_id, amount, reason, transaction_type, source_type, source_id, metadata
        ) values (
          v_user_id,
          -v_reward.point_cost,
          'Reward redemption reserved',
          'reserve',
          'reward_redemption',
          v_redemption_id::text,
          jsonb_build_object('reward_id', v_reward.id, 'status', v_status)
        );

        if v_reward.inventory is not null then
          update public.rewards
          set inventory = inventory - 1,
              updated_at = now()
          where id = v_reward.id;
        end if;

        return query
        select v_redemption_id, v_reward.name, v_reward.point_cost, v_status, v_balance - v_reward.point_cost;
      end;
      $fn$
    $sql$;

    execute $sql$
      create or replace function public.review_reward_redemption(
        p_redemption_id uuid,
        p_approve boolean,
        p_review_note text default null
      )
      returns jsonb
      language plpgsql
      security definer
      set search_path = public
      as $fn$
      declare
        v_parent uuid := auth.uid();
        v_redemption public.reward_redemptions%rowtype;
      begin
        if v_parent is null then
          raise exception 'authentication required';
        end if;
        if not public.is_non_anonymous_user() then
          raise exception 'permanent_account_required' using errcode = '42501';
        end if;

        select rr.* into v_redemption
        from public.reward_redemptions rr
        where rr.id = p_redemption_id
          and rr.status = 'pending_parent'
        for update;

        if not found then raise exception 'redemption_not_pending'; end if;

        if not exists (
          select 1
          from public.parent_links pl
          where pl.teen_user_id = v_redemption.user_id
            and pl.parent_user_id = v_parent
            and pl.status = 'active'
            and pl.is_active = true
        ) then
          raise exception 'not_authorized' using errcode = '42501';
        end if;

        update public.reward_redemptions
        set status = case when p_approve then 'approved' else 'rejected' end,
            reviewed_by = v_parent,
            reviewed_at = now(),
            review_note = p_review_note
        where id = p_redemption_id;

        if not p_approve then
          insert into public.point_transactions(
            user_id, amount, reason, transaction_type, source_type, source_id, metadata
          ) values (
            v_redemption.user_id,
            v_redemption.point_cost,
            'Reward reservation released',
            'release',
            'reward_redemption',
            p_redemption_id::text || ':release',
            jsonb_build_object('redemption_id', p_redemption_id, 'reviewed_by', v_parent)
          );

          update public.rewards r
          set inventory = case when r.inventory is null then null else r.inventory + 1 end,
              updated_at = now()
          where r.id = v_redemption.reward_id;
        end if;

        return jsonb_build_object('approved', p_approve, 'redemption_id', p_redemption_id);
      end;
      $fn$
    $sql$;

  elsif to_regclass('public.reward_catalog') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'reward_redemptions'
         and column_name = 'teen_id'
     ) then

    execute $sql$
      create or replace function public.request_reward_redemption(p_reward_id uuid)
      returns table(
        redemption_id uuid,
        reward_name text,
        point_cost integer,
        status text,
        available_points integer
      )
      language plpgsql
      security definer
      set search_path = public
      as $fn$
      declare
        v_user_id uuid := auth.uid();
        v_reward public.reward_catalog%rowtype;
        v_balance integer := 0;
        v_status text;
        v_redemption_id uuid;
      begin
        if v_user_id is null then
          raise exception 'unauthorized';
        end if;
        if not public.is_non_anonymous_user() then
          raise exception 'permanent_account_required' using errcode = '42501';
        end if;

        select * into v_reward
        from public.reward_catalog
        where id = p_reward_id
          and active = true
        for update;

        if not found then raise exception 'reward_not_found'; end if;
        if v_reward.inventory_count is not null and v_reward.inventory_count <= 0 then
          raise exception 'out_of_stock';
        end if;

        select available into v_balance
        from public.point_balances
        where user_id = v_user_id
        for update;

        v_balance := coalesce(v_balance, 0);
        if v_balance < v_reward.point_cost then raise exception 'insufficient_points'; end if;

        v_status := case when v_reward.requires_parent_approval then 'pending_parent' else 'approved' end;

        insert into public.reward_redemptions(teen_id, reward_id, point_cost, status)
        values (v_user_id, v_reward.id, v_reward.point_cost, v_status)
        returning id into v_redemption_id;

        insert into public.point_transactions(
          user_id, amount, reason, transaction_type, source_type, source_id, metadata
        ) values (
          v_user_id,
          -v_reward.point_cost,
          'Reward redemption reserved',
          'reserve',
          'reward_redemption',
          v_redemption_id::text,
          jsonb_build_object('reward_id', v_reward.id, 'status', v_status)
        );

        if v_reward.inventory_count is not null then
          update public.reward_catalog
          set inventory_count = inventory_count - 1,
              updated_at = now()
          where id = v_reward.id;
        end if;

        return query
        select v_redemption_id, v_reward.name, v_reward.point_cost, v_status, v_balance - v_reward.point_cost;
      end;
      $fn$
    $sql$;

    execute $sql$
      create or replace function public.review_reward_redemption(
        p_redemption_id uuid,
        p_approve boolean,
        p_review_note text default null
      )
      returns jsonb
      language plpgsql
      security definer
      set search_path = public
      as $fn$
      declare
        v_parent uuid := auth.uid();
        v_redemption public.reward_redemptions%rowtype;
      begin
        if v_parent is null then
          raise exception 'authentication required';
        end if;
        if not public.is_non_anonymous_user() then
          raise exception 'permanent_account_required' using errcode = '42501';
        end if;

        select rr.* into v_redemption
        from public.reward_redemptions rr
        where rr.id = p_redemption_id
          and rr.status = 'pending_parent'
        for update;

        if not found then raise exception 'redemption_not_pending'; end if;

        if not exists (
          select 1
          from public.parent_links pl
          where pl.teen_user_id = v_redemption.teen_id
            and pl.parent_user_id = v_parent
            and pl.status = 'active'
            and pl.is_active = true
        ) then
          raise exception 'not_authorized' using errcode = '42501';
        end if;

        update public.reward_redemptions
        set status = case when p_approve then 'approved' else 'rejected' end,
            reviewed_by = v_parent,
            reviewed_at = now(),
            review_note = p_review_note
        where id = p_redemption_id;

        if not p_approve then
          insert into public.point_transactions(
            user_id, amount, reason, transaction_type, source_type, source_id, metadata
          ) values (
            v_redemption.teen_id,
            v_redemption.point_cost,
            'Reward reservation released',
            'release',
            'reward_redemption',
            p_redemption_id::text || ':release',
            jsonb_build_object('redemption_id', p_redemption_id, 'reviewed_by', v_parent)
          );

          update public.reward_catalog r
          set inventory_count = case when r.inventory_count is null then null else r.inventory_count + 1 end,
              updated_at = now()
          where r.id = v_redemption.reward_id;
        end if;

        return jsonb_build_object('approved', p_approve, 'redemption_id', p_redemption_id);
      end;
      $fn$
    $sql$;

  else
    raise exception 'reward_schema_lineage_unrecognized';
  end if;
end
$$;

revoke all on function public.request_reward_redemption(uuid) from public, anon;
grant execute on function public.request_reward_redemption(uuid) to authenticated;
revoke all on function public.review_reward_redemption(uuid,boolean,text) from public, anon;
grant execute on function public.review_reward_redemption(uuid,boolean,text) to authenticated;

comment on function public.request_reward_redemption(uuid) is
  'Permanent-account-only reward reservation RPC, compatible with live and clean-replay reward schema lineages.';
comment on function public.review_reward_redemption(uuid,boolean,text) is
  'Permanent-account-only linked-parent reward review RPC, compatible with live and clean-replay reward schema lineages.';

commit;
