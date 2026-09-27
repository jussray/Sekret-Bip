-- Remove numeric Crew limits and enforce server-controlled relationship states.

begin;

drop trigger if exists trg_circle_members_limit on public.circle_members;
drop function if exists public.enforce_crew_member_limit();

alter table public.crews drop constraint if exists crews_max_members_check;
alter table public.crews alter column max_members drop not null;
alter table public.crews alter column max_members drop default;
update public.crews set max_members = null where max_members is not null;

comment on column public.crews.max_members is
  'Legacy compatibility column. NULL means Crew membership is unlimited.';

drop index if exists public.crew_members_one_member_per_owner;
create unique index if not exists crew_members_one_relationship_per_owner
  on public.crew_members (user_id, member_user_id)
  where member_user_id is not null;

create index if not exists crew_members_member_status_idx
  on public.crew_members (member_user_id, connection_status, user_id)
  where member_user_id is not null;

alter table public.crew_members drop constraint if exists crew_members_no_self_link;
alter table public.crew_members
  add constraint crew_members_no_self_link
  check (member_user_id is null or user_id <> member_user_id);

alter table public.crew_members drop constraint if exists crew_members_status_identity_consistency;
alter table public.crew_members
  add constraint crew_members_status_identity_consistency
  check (
    (connection_status = 'pending' and member_user_id is null and accepted_at is null)
    or (connection_status = 'accepted' and member_user_id is not null and accepted_at is not null)
    or connection_status in ('blocked', 'removed')
  );

create or replace function public.guard_crew_member_write()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if current_setting('app.crew_acceptance', true) = '1' then
    return new;
  end if;

  if v_uid is null or v_is_anonymous then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> v_uid then
      raise exception 'crew_owner_mismatch' using errcode = '42501';
    end if;
    if new.connection_status <> 'pending'
       or new.member_user_id is not null
       or new.accepted_at is not null then
      raise exception 'crew_acceptance_is_server_controlled' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.user_id <> old.user_id or new.id <> old.id then
    raise exception 'crew_relationship_identity_is_immutable' using errcode = '42501';
  end if;
  if old.user_id <> v_uid then
    raise exception 'crew_owner_mismatch' using errcode = '42501';
  end if;
  if new.member_user_id is distinct from old.member_user_id
     or new.accepted_at is distinct from old.accepted_at then
    raise exception 'crew_acceptance_is_server_controlled' using errcode = '42501';
  end if;
  if new.connection_status = 'accepted' and old.connection_status <> 'accepted' then
    raise exception 'crew_acceptance_is_server_controlled' using errcode = '42501';
  end if;
  if new.connection_status <> old.connection_status
     and not (
       (old.connection_status in ('pending', 'accepted') and new.connection_status in ('blocked', 'removed'))
       or (old.connection_status = 'blocked' and new.connection_status = 'removed')
     ) then
    raise exception 'invalid_crew_status_transition' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists crew_members_guard_write on public.crew_members;
create trigger crew_members_guard_write
before insert or update on public.crew_members
for each row execute function public.guard_crew_member_write();

drop policy if exists crew_members_self on public.crew_members;
drop policy if exists crew_members_owner_select on public.crew_members;
drop policy if exists crew_members_owner_insert on public.crew_members;
drop policy if exists crew_members_owner_update on public.crew_members;
drop policy if exists crew_members_owner_delete on public.crew_members;

create policy crew_members_owner_select on public.crew_members
for select to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

create policy crew_members_owner_insert on public.crew_members
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
  and connection_status = 'pending'
  and member_user_id is null
  and accepted_at is null
);

create policy crew_members_owner_update on public.crew_members
for update to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
)
with check (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

create policy crew_members_owner_delete on public.crew_members
for delete to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

commit;
