-- Harden legacy membership paths and let either participant leave or block.

begin;

-- Legacy crew_memberships may be read by either participant, but only guarded
-- database functions may write relationship membership.
drop policy if exists cm_self on public.crew_memberships;
create policy crew_memberships_participant_select on public.crew_memberships
for select to authenticated
using (
  ((select auth.uid()) = user_id or (select auth.uid()) = member_id)
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

revoke insert, update, delete on table public.crew_memberships from authenticated, anon;
grant select on table public.crew_memberships to authenticated;

-- A legacy Crew circle may contain only its owner or an accepted Crew account.
drop policy if exists "circle members insert owner only" on public.circle_members;
create policy "circle members insert owner accepted crew only" on public.circle_members
for insert to authenticated
with check (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
  and exists (
    select 1
    from public.circles c
    where c.id = circle_id
      and c.owner_user_id = (select auth.uid())
      and (
        c.kind::text <> 'crew'
        or user_id = (select auth.uid())
        or exists (
          select 1
          from public.crew_members cm
          where cm.user_id = c.owner_user_id
            and cm.member_user_id = circle_members.user_id
            and cm.connection_status = 'accepted'
        )
      )
  )
);

create or replace function public.cleanup_crew_relationship_access()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.connection_status = new.connection_status
     or new.connection_status not in ('blocked', 'removed')
     or new.member_user_id is null then
    return new;
  end if;

  delete from public.crew_memberships
  where (user_id = new.user_id and member_id = new.member_user_id)
     or (user_id = new.member_user_id and member_id = new.user_id);

  update public.crew_check_in_shares
  set status = 'revoked',
      revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where status = 'active'
    and (
      (owner_user_id = new.user_id and shared_with = new.member_user_id)
      or (owner_user_id = new.member_user_id and shared_with = new.user_id)
    );

  delete from public.circle_members cm
  using public.circles c
  where cm.circle_id = c.id
    and c.kind::text = 'crew'
    and (
      (c.owner_user_id = new.user_id and cm.user_id = new.member_user_id)
      or (c.owner_user_id = new.member_user_id and cm.user_id = new.user_id)
    );

  return new;
end;
$$;

revoke all on function public.cleanup_crew_relationship_access() from public, anon, authenticated;

drop trigger if exists crew_members_cleanup_access on public.crew_members;
create trigger crew_members_cleanup_access
after update of connection_status on public.crew_members
for each row execute function public.cleanup_crew_relationship_access();

create or replace function public.set_crew_connection_status(
  p_other_user_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_user_id uuid;
  v_row_id bigint;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;
  if p_other_user_id is null or p_other_user_id = v_user_id then
    raise exception 'invalid_crew_account' using errcode = '22023';
  end if;
  if p_status not in ('blocked', 'removed') then
    raise exception 'invalid_crew_status' using errcode = '22023';
  end if;

  select cm.user_id, cm.id
  into v_owner_user_id, v_row_id
  from public.crew_members cm
  where cm.member_user_id is not null
    and (
      (cm.user_id = v_user_id and cm.member_user_id = p_other_user_id)
      or (cm.user_id = p_other_user_id and cm.member_user_id = v_user_id)
    )
    and cm.connection_status in ('accepted', 'blocked')
  order by case when cm.connection_status = 'accepted' then 0 else 1 end
  limit 1
  for update;

  if v_row_id is null then
    raise exception 'crew_connection_not_found' using errcode = 'P0002';
  end if;

  perform set_config('app.crew_acceptance', '1', true);
  update public.crew_members
  set connection_status = p_status
  where user_id = v_owner_user_id and id = v_row_id;

  return true;
end;
$$;

revoke all on function public.set_crew_connection_status(uuid, text) from public, anon;
grant execute on function public.set_crew_connection_status(uuid, text) to authenticated;

comment on function public.set_crew_connection_status(uuid, text) is
  'Lets either participant block or leave an accepted Crew relationship. Trusted identity and active shared access are revoked immediately.';

commit;
