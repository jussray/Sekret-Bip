begin;

-- Anonymous Supabase Auth users receive the authenticated database role and a
-- real auth.uid(). Se'kret Bip intentionally creates an anonymous session for
-- pre-account/local continuity, but durable activity/economy rows are a
-- permanent-account surface. Keep the existing owner/link semantics while
-- requiring is_anonymous=false on every direct RLS path that can feed or expose
-- the point/task/reward ledger.

alter table public.bip_events enable row level security;
revoke all on table public.bip_events from public, anon, authenticated;
grant select, insert, update, delete on table public.bip_events to authenticated;
drop policy if exists "bip_events: teen all" on public.bip_events;
drop policy if exists bip_events_permanent_owner_all on public.bip_events;
create policy bip_events_permanent_owner_all
on public.bip_events
for all
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);
comment on policy bip_events_permanent_owner_all on public.bip_events is
  'Permanent authenticated account may access only its own canonical Bip activity ledger.';

-- activity_events exists in the current production lineage but is intentionally
-- absent from a clean canonical replay. Harden that historical live-only table
-- when present without making fresh database construction depend on it.
do $$
begin
  if to_regclass('public.activity_events') is not null then
    execute 'alter table public.activity_events enable row level security';
    execute 'revoke all on table public.activity_events from public, anon, authenticated';
    execute 'grant select, insert on table public.activity_events to authenticated';
    execute 'drop policy if exists activity_events_owner_insert on public.activity_events';
    execute 'drop policy if exists activity_events_owner_select on public.activity_events';
    execute 'drop policy if exists activity_events_permanent_owner_insert on public.activity_events';
    execute 'drop policy if exists activity_events_permanent_owner_select on public.activity_events';
    execute 'create policy activity_events_permanent_owner_insert on public.activity_events for insert to authenticated with check (public.is_non_anonymous_user() and (select auth.uid()) = user_id)';
    execute 'create policy activity_events_permanent_owner_select on public.activity_events for select to authenticated using (public.is_non_anonymous_user() and (select auth.uid()) = user_id)';
  end if;
end
$$;

-- Point-ledger reads should mirror the same permanent-account boundary as the
-- private sync tables. Trigger functions remain server-owned.
drop policy if exists app_point_awards_owner_read on public.app_point_awards;
create policy app_point_awards_owner_read
on public.app_point_awards
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

drop policy if exists point_inactivity_adjustments_owner_read on public.point_inactivity_adjustments;
create policy point_inactivity_adjustments_owner_read
on public.point_inactivity_adjustments
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

drop policy if exists point_balances_owner_read on public.point_balances;
create policy point_balances_owner_read
on public.point_balances
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

drop policy if exists point_balances_linked_guardian_read on public.point_balances;
create policy point_balances_linked_guardian_read
on public.point_balances
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = point_balances.user_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists point_transactions_owner_read on public.point_transactions;
create policy point_transactions_owner_read
on public.point_transactions
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

-- Tasks are durable teen/parent accountability data. Preserve the current
-- ownership/link rules and add the permanent-account membrane explicitly.
drop policy if exists bip_tasks_teen_select on public.bip_tasks;
create policy bip_tasks_teen_select
on public.bip_tasks
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = teen_id
);

drop policy if exists bip_tasks_teen_insert on public.bip_tasks;
create policy bip_tasks_teen_insert
on public.bip_tasks
for insert
to authenticated
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = teen_id
  and (select auth.uid()) = created_by
  and created_by_role = 'teen'
  and point_value = 0
  and requires_approval = false
);

drop policy if exists bip_tasks_teen_update on public.bip_tasks;
create policy bip_tasks_teen_update
on public.bip_tasks
for update
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = created_by
  and created_by_role = 'teen'
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = created_by
  and created_by_role = 'teen'
  and teen_id = (select auth.uid())
  and point_value = 0
  and requires_approval = false
);

drop policy if exists bip_tasks_linked_parent_select on public.bip_tasks;
create policy bip_tasks_linked_parent_select
on public.bip_tasks
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bip_tasks_linked_parent_insert on public.bip_tasks;
create policy bip_tasks_linked_parent_insert
on public.bip_tasks
for insert
to authenticated
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists bip_tasks_linked_parent_update on public.bip_tasks;
create policy bip_tasks_linked_parent_update
on public.bip_tasks
for update
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = created_by
  and created_by_role = 'parent'
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists task_submissions_teen_select on public.task_submissions;
create policy task_submissions_teen_select
on public.task_submissions
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = teen_id
);

drop policy if exists task_submissions_linked_parent_select on public.task_submissions;
create policy task_submissions_linked_parent_select
on public.task_submissions
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = task_submissions.teen_id
      and pl.parent_user_id = (select auth.uid())
      and pl.status = 'active'
      and pl.is_active = true
  )
);

-- Production currently identifies reward owners with user_id, while a clean
-- canonical replay still carries the earlier teen_id column. Harden whichever
-- lineage is present and fail closed if neither ownership column exists.
drop policy if exists reward_redemptions_owner_read on public.reward_redemptions;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reward_redemptions'
      and column_name = 'user_id'
  ) then
    execute 'create policy reward_redemptions_owner_read on public.reward_redemptions for select to authenticated using (public.is_non_anonymous_user() and (select auth.uid()) = user_id)';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reward_redemptions'
      and column_name = 'teen_id'
  ) then
    execute 'create policy reward_redemptions_owner_read on public.reward_redemptions for select to authenticated using (public.is_non_anonymous_user() and (select auth.uid()) = teen_id)';
  else
    raise exception 'reward_redemptions_owner_column_missing';
  end if;
end
$$;

-- Direct circle profile reads are owner-only for permanent accounts. The feed
-- identity RPC intentionally exposes only pseudonym fields, so give it the same
-- permanent-account gate as the public feed RPCs before it bypasses table RLS.
create or replace function public.get_public_circle_profiles(
  p_user_ids uuid[]
)
returns table (
  user_id uuid,
  nickname text,
  avatar_emoji text
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if coalesce(array_length(p_user_ids, 1), 0) > 100 then
    raise exception 'too many profile ids' using errcode = '22023';
  end if;

  return query
  select cp.user_id, cp.nickname, cp.avatar_emoji
  from public.circle_profiles cp
  where cp.user_id = any(coalesce(p_user_ids, array[]::uuid[]));
end;
$$;

revoke all on function public.get_public_circle_profiles(uuid[]) from public, anon;
grant execute on function public.get_public_circle_profiles(uuid[]) to authenticated;

commit;
