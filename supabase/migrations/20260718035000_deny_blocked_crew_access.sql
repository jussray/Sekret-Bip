begin;

-- Defense in depth for Crew privacy. The relationship cleanup trigger revokes
-- active shares when either participant blocks or leaves. A private,
-- security-definer policy helper also checks the full check-in/share/relationship
-- contract without creating recursive RLS evaluation between the two public
-- tables. The helper binds its member argument to the current permanent caller,
-- so it cannot be used as an arbitrary relationship-enumeration primitive.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.crew_check_in_access_is_active(
  p_check_in_id uuid,
  p_owner_user_id uuid,
  p_member_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select auth.uid()) is not null
    and (select auth.uid()) = p_member_user_id
    and not coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false)
    and p_check_in_id is not null
    and p_owner_user_id is not null
    and p_member_user_id is not null
    and p_owner_user_id <> p_member_user_id
    and exists (
      select 1
      from public.crew_check_ins ci
      where ci.id = p_check_in_id
        and ci.owner_user_id = p_owner_user_id
        and ci.status = 'active'
    )
    and exists (
      select 1
      from public.crew_check_in_shares share_row
      where share_row.check_in_id = p_check_in_id
        and share_row.owner_user_id = p_owner_user_id
        and share_row.shared_with = p_member_user_id
        and share_row.status = 'active'
    )
    and exists (
      select 1
      from public.crew_members accepted
      where accepted.user_id = p_owner_user_id
        and accepted.member_user_id = p_member_user_id
        and accepted.connection_status = 'accepted'
    )
    and not exists (
      select 1
      from public.crew_members blocked
      where blocked.connection_status = 'blocked'
        and (
          (blocked.user_id = p_owner_user_id and blocked.member_user_id = p_member_user_id)
          or (blocked.user_id = p_member_user_id and blocked.member_user_id = p_owner_user_id)
        )
    );
$$;

revoke all on function private.crew_check_in_access_is_active(uuid, uuid, uuid)
  from public, anon;
grant execute on function private.crew_check_in_access_is_active(uuid, uuid, uuid)
  to authenticated;

comment on function private.crew_check_in_access_is_active(uuid, uuid, uuid) is
  'Private RLS helper bound to the current permanent member. Confirms one active check-in, owner-consistent active share, accepted Crew relationship, and no block in either direction. It is intentionally outside exposed API schemas.';

drop policy if exists crew_check_in_shares_crew_read on public.crew_check_in_shares;
create policy crew_check_in_shares_crew_read on public.crew_check_in_shares
  for select to authenticated
  using (
    (select auth.uid()) = shared_with
    and status = 'active'
    and private.crew_check_in_access_is_active(
      check_in_id,
      owner_user_id,
      (select auth.uid())
    )
  );

drop policy if exists crew_check_ins_crew_read on public.crew_check_ins;
create policy crew_check_ins_crew_read on public.crew_check_ins
  for select to authenticated
  using (
    status = 'active'
    and private.crew_check_in_access_is_active(
      id,
      owner_user_id,
      (select auth.uid())
    )
  );

-- The check-in owner may retain their own encouragement history. A former or
-- blocked Crew member loses direct encouragement reads when active share access
-- ends, matching the feed and revocation boundary.
drop policy if exists crew_encouragements_read on public.crew_encouragements;
create policy crew_encouragements_read on public.crew_encouragements
  for select to authenticated
  using (
    (select auth.uid()) = recipient_user_id
    or (
      (select auth.uid()) = sender_user_id
      and private.crew_check_in_access_is_active(
        check_in_id,
        recipient_user_id,
        sender_user_id
      )
    )
  );

drop policy if exists crew_encouragements_sender_insert on public.crew_encouragements;
create policy crew_encouragements_sender_insert on public.crew_encouragements
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_user_id
    and recipient_user_id <> sender_user_id
    and private.crew_check_in_access_is_active(
      check_in_id,
      recipient_user_id,
      sender_user_id
    )
  );

commit;
