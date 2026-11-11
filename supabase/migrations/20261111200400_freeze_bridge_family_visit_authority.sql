begin;

-- Freeze Family Visit evidence after summaries are ready, and ensure every
-- transition away from verified professional authority permanently revokes the
-- active case graph. Re-verification must require a fresh founder/admin case
-- assignment instead of silently restoring an old one.

create or replace function public.review_bridge_professional_access(
  p_target_user_id uuid,
  p_organization_kind text,
  p_organization_label text,
  p_verification_status text,
  p_review_reference text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_reviewer uuid := auth.uid();
  v_reviewer_role text;
  v_target_side text;
  v_target_complete boolean;
begin
  if v_reviewer is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select role into v_reviewer_role
  from public.app_profiles
  where user_id = v_reviewer;
  if v_reviewer_role not in ('founder','admin') then
    raise exception 'founder or admin review required' using errcode = '42501';
  end if;

  if p_organization_kind not in ('cys','court','casa','agency','other')
     or nullif(btrim(p_organization_label), '') is null
     or char_length(btrim(p_organization_label)) > 120
     or p_verification_status not in ('pending','verified','suspended','revoked')
     or nullif(btrim(p_review_reference), '') is null
     or char_length(btrim(p_review_reference)) < 8
     or char_length(btrim(p_review_reference)) > 200 then
    raise exception 'invalid professional review input' using errcode = '22023';
  end if;

  select account_side, onboarding_complete
    into v_target_side, v_target_complete
  from public.app_profiles
  where user_id = p_target_user_id;
  if v_target_side <> 'parent' or v_target_complete is not true then
    raise exception 'completed permanent adult account required' using errcode = '42501';
  end if;

  insert into public.bridge_professional_profiles (
    user_id, organization_kind, organization_label, verification_status,
    review_reference, verified_at, reviewed_by, updated_at
  ) values (
    p_target_user_id, p_organization_kind, btrim(p_organization_label),
    p_verification_status, btrim(p_review_reference),
    case when p_verification_status = 'verified' then now() else null end,
    v_reviewer, now()
  )
  on conflict (user_id) do update
  set organization_kind = excluded.organization_kind,
      organization_label = excluded.organization_label,
      verification_status = excluded.verification_status,
      review_reference = excluded.review_reference,
      verified_at = case when excluded.verification_status = 'verified' then now() else null end,
      reviewed_by = v_reviewer,
      updated_at = now();

  if p_verification_status <> 'verified' then
    update public.bridge_case_assignments
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where professional_user_id = p_target_user_id
      and status = 'active';

    update public.bridge_family_visit_sessions s
    set state = 'revoked', ended_at = coalesce(ended_at, now()), updated_at = now()
    where state not in ('ready','declined','revoked','expired')
      and exists (
        select 1 from public.bridge_case_assignments a
        where a.id = s.assignment_id
          and a.professional_user_id = p_target_user_id
          and a.status = 'revoked'
      );
  end if;

  return p_verification_status;
end;
$$;

revoke execute on function public.review_bridge_professional_access(uuid,text,text,text,text) from public, anon;
grant execute on function public.review_bridge_professional_access(uuid,text,text,text,text) to authenticated;

create or replace function public.submit_bridge_family_visit_reflection(
  p_session_id uuid,
  p_felt_heard text default null,
  p_felt_comfortable text default null,
  p_could_pause text default null,
  p_connection_after text default null,
  p_next_support text default null,
  p_review_signal text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_reflection_id uuid;
  v_assignment public.bridge_case_assignments%rowtype;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select a.* into v_assignment
  from public.bridge_case_assignments a
  join public.bridge_family_visit_sessions s on s.assignment_id = a.id
  where s.id = p_session_id
    and s.state = 'reflection'
    and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now());
  if not found then raise exception 'reflection session required' using errcode = '42501'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id
        and exists (
          select 1 from public.bridge_professional_profiles
          where user_id = v_user and verification_status = 'verified'
        ) then v_role := 'professional';
  else raise exception 'session participant required' using errcode = '42501';
  end if;

  if v_role = 'professional' then
    if p_review_signal is null
       or p_review_signal not in ('no_concern_observed','mixed','needs_human_review','insufficient_evidence')
       or p_felt_heard is not null
       or p_felt_comfortable is not null
       or p_could_pause is not null
       or p_connection_after is not null
       or p_next_support is not null then
      raise exception 'professional reflection must use only review_signal' using errcode = '22023';
    end if;
  else
    if p_review_signal is not null
       or p_felt_heard not in ('yes','somewhat','no','not_sure')
       or p_felt_comfortable not in ('yes','somewhat','no','not_sure')
       or p_could_pause not in ('yes','somewhat','no','not_sure')
       or p_connection_after not in ('closer','same','more_distant','not_sure')
       or p_next_support not in ('listen','space','reassurance','clear_plan','human_follow_up','none','not_sure') then
      raise exception 'invalid participant reflection' using errcode = '22023';
    end if;
  end if;

  insert into public.bridge_family_visit_reflections (
    session_id, actor_user_id, actor_role, felt_heard, felt_comfortable, could_pause,
    connection_after, next_support, review_signal, updated_at
  ) values (
    p_session_id, v_user, v_role,
    case when v_role = 'professional' then null else p_felt_heard end,
    case when v_role = 'professional' then null else p_felt_comfortable end,
    case when v_role = 'professional' then null else p_could_pause end,
    case when v_role = 'professional' then null else p_connection_after end,
    case when v_role = 'professional' then null else p_next_support end,
    case when v_role = 'professional' then p_review_signal else null end,
    now()
  )
  on conflict (session_id, actor_user_id) do update
  set actor_role = excluded.actor_role,
      felt_heard = excluded.felt_heard,
      felt_comfortable = excluded.felt_comfortable,
      could_pause = excluded.could_pause,
      connection_after = excluded.connection_after,
      next_support = excluded.next_support,
      review_signal = excluded.review_signal,
      submitted_at = now(),
      updated_at = now()
  returning id into v_reflection_id;

  -- The session timestamp is the optimistic evidence version used by the Worker.
  -- If generation froze the session between the read above and this write, fail
  -- the entire transaction so no post-ready evidence mutation can land.
  update public.bridge_family_visit_sessions
  set updated_at = now()
  where id = p_session_id
    and state = 'reflection';
  if not found then
    raise exception 'family visit evidence is already frozen' using errcode = '40001';
  end if;

  return v_reflection_id;
end;
$$;

revoke execute on function public.submit_bridge_family_visit_reflection(uuid,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_bridge_family_visit_reflection(uuid,text,text,text,text,text,text) to authenticated;

commit;
