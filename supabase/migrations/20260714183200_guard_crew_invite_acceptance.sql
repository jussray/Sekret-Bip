-- Server-controlled Crew invite acceptance.
-- The p_first_name argument is retained for compatibility but intentionally ignored.

begin;

create or replace function public.redeem_crew_invite(
  p_invite_code text,
  p_first_name text default null
)
returns table (
  owner_user_id uuid,
  crew_member_id bigint,
  display_name text,
  connection_status text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.crew_members%rowtype;
  v_existing public.crew_members%rowtype;
  v_private_name text;
  v_result_id bigint;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_invite_code is null or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,32}$' then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select * into v_invite
  from public.crew_members
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then raise exception 'invite_not_found' using errcode = 'P0002'; end if;
  if v_invite.connection_status <> 'pending' or v_invite.member_user_id is not null then
    raise exception 'invite_not_pending' using errcode = '22023';
  end if;
  if v_invite.user_id = v_user_id then
    raise exception 'cannot_redeem_own_invite' using errcode = '22023';
  end if;

  select nullif(trim(private_display_name), '') into v_private_name
  from public.app_profiles
  where user_id = v_user_id and onboarding_complete is true;

  if v_private_name is null then
    raise exception 'completed_account_profile_required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.app_profiles
    where user_id = v_invite.user_id
      and onboarding_complete is true
      and nullif(trim(private_display_name), '') is not null
  ) then
    raise exception 'crew_owner_profile_incomplete' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.crew_members cm
    where cm.connection_status = 'blocked'
      and (
        (cm.user_id = v_invite.user_id and cm.member_user_id = v_user_id)
        or (cm.user_id = v_user_id and cm.member_user_id = v_invite.user_id)
      )
  ) then
    raise exception 'crew_connection_blocked' using errcode = '42501';
  end if;

  select * into v_existing
  from public.crew_members
  where user_id = v_invite.user_id and member_user_id = v_user_id
  for update;

  perform set_config('app.crew_acceptance', '1', true);

  if found then
    if v_existing.connection_status = 'accepted' then
      raise exception 'crew_connection_already_accepted' using errcode = '23505';
    end if;
    if v_existing.connection_status = 'blocked' then
      raise exception 'crew_connection_blocked' using errcode = '42501';
    end if;

    delete from public.crew_members
    where user_id = v_invite.user_id and id = v_invite.id;

    update public.crew_members
    set connection_status = 'accepted',
        accepted_at = now(),
        name = 'Accepted Crew member'
    where user_id = v_existing.user_id and id = v_existing.id
    returning id into v_result_id;
  else
    update public.crew_members
    set member_user_id = v_user_id,
        connection_status = 'accepted',
        accepted_at = now(),
        name = 'Accepted Crew member'
    where user_id = v_invite.user_id and id = v_invite.id
    returning id into v_result_id;
  end if;

  insert into public.crew_memberships (user_id, member_id)
  values (v_invite.user_id, v_user_id)
  on conflict (user_id, member_id) do nothing;

  return query
  select v_invite.user_id, v_result_id, v_private_name, 'accepted'::text, now();
end;
$$;

revoke all on function public.redeem_crew_invite(text, text) from public, anon;
grant execute on function public.redeem_crew_invite(text, text) to authenticated;

comment on function public.redeem_crew_invite(text, text) is
  'Accepts a pending Crew invite for a permanent account. The client cannot choose another account identity or force accepted status.';

commit;
