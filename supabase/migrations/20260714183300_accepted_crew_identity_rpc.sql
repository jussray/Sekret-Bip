-- Reveal private account identity only inside an accepted, non-blocked Crew relationship.

begin;

create or replace function public.get_crew_connection_profiles(p_user_ids uuid[])
returns table (
  user_id uuid,
  display_name text,
  avatar_emoji text,
  identity_visibility text,
  connection_status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  return query
  with requested as (
    select distinct requested_id
    from unnest(coalesce(p_user_ids, array[]::uuid[])) requested_id
    where requested_id is not null and requested_id <> v_user_id
  ), trusted as (
    select r.requested_id
    from requested r
    where exists (
      select 1
      from public.crew_members cm
      where cm.connection_status = 'accepted'
        and (
          (cm.user_id = v_user_id and cm.member_user_id = r.requested_id)
          or (cm.user_id = r.requested_id and cm.member_user_id = v_user_id)
        )
    )
    and not exists (
      select 1
      from public.crew_members cm
      where cm.connection_status = 'blocked'
        and (
          (cm.user_id = v_user_id and cm.member_user_id = r.requested_id)
          or (cm.user_id = r.requested_id and cm.member_user_id = v_user_id)
        )
    )
  )
  select
    ap.user_id,
    coalesce(nullif(trim(ap.private_display_name), ''), 'Crew member'),
    coalesce(nullif(trim(cp.avatar_emoji), ''), '🌙'),
    'accepted_crew'::text,
    'accepted'::text
  from trusted t
  join public.app_profiles ap
    on ap.user_id = t.requested_id
   and ap.onboarding_complete is true
  left join public.circle_profiles cp on cp.user_id = ap.user_id;
end;
$$;

revoke all on function public.get_crew_connection_profiles(uuid[]) from public, anon;
grant execute on function public.get_crew_connection_profiles(uuid[]) to authenticated;

comment on function public.get_crew_connection_profiles(uuid[]) is
  'Returns private display identity only for accepted, non-blocked Crew relationships. Pending, removed, blocked, and stranger accounts receive no row.';

commit;
