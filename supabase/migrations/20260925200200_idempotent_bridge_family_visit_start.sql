begin;

-- One assignment may have at most one open Family Visit session. Retries and
-- double taps must return the existing waiting/active/reflection session rather
-- than fork acknowledgement or reflection state.
create unique index if not exists bridge_family_visit_sessions_one_open_per_assignment
  on public.bridge_family_visit_sessions (assignment_id)
  where state in ('awaiting_ack','active','reflection');

create or replace function public.start_bridge_family_visit_session(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.bridge_case_assignments a
    join public.bridge_professional_profiles pp on pp.user_id = a.professional_user_id
    where a.id = p_assignment_id
      and a.professional_user_id = v_user
      and a.status = 'active'
      and (a.expires_at is null or a.expires_at > now())
      and pp.verification_status = 'verified'
  ) then
    raise exception 'active verified professional assignment required' using errcode = '42501';
  end if;

  select id into v_session_id
  from public.bridge_family_visit_sessions
  where assignment_id = p_assignment_id
    and state in ('awaiting_ack','active','reflection')
  order by created_at desc
  limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  insert into public.bridge_family_visit_sessions (
    assignment_id, state, capture_mode, created_by
  ) values (
    p_assignment_id, 'awaiting_ack', 'none', v_user
  )
  on conflict (assignment_id)
    where state in ('awaiting_ack','active','reflection')
  do nothing
  returning id into v_session_id;

  if v_session_id is null then
    select id into v_session_id
    from public.bridge_family_visit_sessions
    where assignment_id = p_assignment_id
      and state in ('awaiting_ack','active','reflection')
    order by created_at desc
    limit 1;
  end if;

  if v_session_id is null then
    raise exception 'could not establish family visit session' using errcode = 'P0001';
  end if;

  return v_session_id;
end;
$$;

revoke execute on function public.start_bridge_family_visit_session(uuid) from public, anon;
grant execute on function public.start_bridge_family_visit_session(uuid) to authenticated;

commit;
