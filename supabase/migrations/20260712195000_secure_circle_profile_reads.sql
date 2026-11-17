begin;

-- Direct reads stay owner-only so the existing profile upsert can use normal
-- PostgREST semantics without exposing another account's account_type.
alter table public.circle_profiles enable row level security;

drop policy if exists circle_profiles_public_identity_select on public.circle_profiles;
drop policy if exists circle_profiles_owner_select on public.circle_profiles;

create policy circle_profiles_owner_select
on public.circle_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) is false
);

revoke all on table public.circle_profiles from anon;
revoke all on table public.circle_profiles from authenticated;
grant select, insert, update on table public.circle_profiles to authenticated;

-- Feed readers need only the public pseudonym fields. This RPC deliberately
-- returns no account_type and accepts at most one feed page of author IDs.
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
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
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

revoke all on function public.get_public_circle_profiles(uuid[]) from public;
revoke all on function public.get_public_circle_profiles(uuid[]) from anon;
grant execute on function public.get_public_circle_profiles(uuid[]) to authenticated;

commit;
