create or replace function public.redeem_crew_invite(p_invite_code text, p_first_name text)
returns table (
  owner_user_id uuid,
  crew_member_id bigint,
  display_name text,
  connection_status text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.crew_members%rowtype;
  v_name text;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_invite_code is null or p_invite_code !~ '^[A-Z0-9]{4,32}$' then
    raise exception 'invalid_invite_code';
  end if;

  select * into v_invite
  from public.crew_members
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_invite.connection_status <> 'pending' then
    raise exception 'invite_not_pending';
  end if;
  if v_invite.user_id = v_user_id then
    raise exception 'cannot_redeem_own_invite';
  end if;
  if v_invite.member_user_id is not null then
    raise exception 'invite_already_claimed';
  end if;

  v_name := left(coalesce(nullif(trim(p_first_name), ''), 'Crew member'), 60);

  update public.crew_members
  set member_user_id = v_user_id,
      connection_status = 'accepted',
      accepted_at = now(),
      name = v_name
  where user_id = v_invite.user_id and id = v_invite.id;

  insert into public.crew_memberships (user_id, member_id)
  values (v_invite.user_id, v_user_id)
  on conflict (user_id, member_id) do nothing;

  return query
  select cm.user_id, cm.id, cm.name, cm.connection_status, cm.accepted_at
  from public.crew_members cm
  where cm.user_id = v_invite.user_id and cm.id = v_invite.id;
end;
$$;

revoke all on function public.redeem_crew_invite(text,text) from public;
grant execute on function public.redeem_crew_invite(text,text) to authenticated;
