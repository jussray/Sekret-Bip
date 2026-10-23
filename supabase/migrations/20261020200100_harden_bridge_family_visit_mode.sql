begin;

-- Follow-up hardening for Bridge Family Visit Mode. This migration deliberately
-- keeps teen transparency while making every parent/professional sharing path
-- depend on the assigned professional still being verified.

-- Parent/professional assignment visibility requires a currently verified
-- professional. Teen owners retain their own assignment history.
drop policy if exists bridge_case_assignments_participant_select on public.bridge_case_assignments;
create policy bridge_case_assignments_participant_select
on public.bridge_case_assignments for select to authenticated
using (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and (
    teen_user_id = auth.uid()
    or (
      status = 'active'
      and (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.bridge_professional_profiles pp
        where pp.user_id = bridge_case_assignments.professional_user_id
          and pp.verification_status = 'verified'
      )
      and (
        parent_user_id = auth.uid()
        or professional_user_id = auth.uid()
      )
    )
  )
);

drop policy if exists bridge_family_visit_sessions_participant_select on public.bridge_family_visit_sessions;
create policy bridge_family_visit_sessions_participant_select
on public.bridge_family_visit_sessions for select to authenticated
using (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_case_assignments a
    where a.id = bridge_family_visit_sessions.assignment_id
      and (
        a.teen_user_id = auth.uid()
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (
            a.parent_user_id = auth.uid()
            or a.professional_user_id = auth.uid()
          )
        )
      )
  )
);

-- Raw structured inputs remain owner-only, but a parent/professional loses even
-- that owner read when the assignment expires/revokes or professional authority
-- is suspended. The teen retains their own submissions for transparency.
drop policy if exists bridge_family_visit_markers_owner_select on public.bridge_family_visit_markers;
create policy bridge_family_visit_markers_owner_select
on public.bridge_family_visit_markers for select to authenticated
using (
  actor_user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_markers.session_id
      and (
        a.teen_user_id = auth.uid()
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and auth.uid() in (a.parent_user_id, a.professional_user_id)
        )
      )
  )
);

drop policy if exists bridge_family_visit_reflections_owner_select on public.bridge_family_visit_reflections;
create policy bridge_family_visit_reflections_owner_select
on public.bridge_family_visit_reflections for select to authenticated
using (
  actor_user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_reflections.session_id
      and (
        a.teen_user_id = auth.uid()
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and auth.uid() in (a.parent_user_id, a.professional_user_id)
        )
      )
  )
);

drop policy if exists bridge_family_visit_summaries_audience_select on public.bridge_family_visit_summaries;
create policy bridge_family_visit_summaries_audience_select
on public.bridge_family_visit_summaries for select to authenticated
using (
  coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.bridge_family_visit_sessions s
    join public.bridge_case_assignments a on a.id = s.assignment_id
    where s.id = bridge_family_visit_summaries.session_id
      and (
        a.teen_user_id = auth.uid()
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = a.professional_user_id
              and pp.verification_status = 'verified'
          )
          and (
            (bridge_family_visit_summaries.audience = 'parent' and a.parent_user_id = auth.uid())
            or
            (bridge_family_visit_summaries.audience = 'professional' and a.professional_user_id = auth.uid())
          )
        )
      )
  )
);

-- Suspending or revoking professional authority invalidates all active case
-- assignments for that professional. Re-verification never silently restores a
-- case; a new founder/admin assignment is required.
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

  if p_verification_status in ('suspended','revoked') then
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

-- Expire only a matching stale assignment before creating its replacement.
create or replace function public.create_bridge_case_assignment(
  p_teen_user_id uuid,
  p_parent_user_id uuid,
  p_professional_user_id uuid,
  p_approval_reference text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_creator uuid := auth.uid();
  v_creator_role text;
  v_assignment_id uuid;
begin
  if v_creator is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select role into v_creator_role from public.app_profiles where user_id = v_creator;
  if v_creator_role not in ('founder','admin') then
    raise exception 'founder or admin assignment authority required' using errcode = '42501';
  end if;

  if p_teen_user_id is null
     or p_parent_user_id is null
     or p_professional_user_id is null
     or p_teen_user_id = p_parent_user_id
     or p_teen_user_id = p_professional_user_id
     or p_parent_user_id = p_professional_user_id
     or nullif(btrim(p_approval_reference), '') is null
     or char_length(btrim(p_approval_reference)) < 8
     or char_length(btrim(p_approval_reference)) > 200
     or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'invalid assignment input' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.app_profiles
    where user_id = p_teen_user_id and account_side = 'teen' and onboarding_complete is true
  ) then
    raise exception 'completed teen-side account required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.app_profiles
    where user_id = p_parent_user_id and account_side = 'parent' and onboarding_complete is true
  ) then
    raise exception 'completed parent-side account required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.bridge_professional_profiles
    where user_id = p_professional_user_id and verification_status = 'verified'
  ) then
    raise exception 'verified professional required' using errcode = '42501';
  end if;

  update public.bridge_case_assignments
  set status = 'expired', updated_at = now()
  where teen_user_id = p_teen_user_id
    and parent_user_id = p_parent_user_id
    and professional_user_id = p_professional_user_id
    and status = 'active'
    and expires_at is not null
    and expires_at <= now();

  insert into public.bridge_case_assignments (
    teen_user_id, parent_user_id, professional_user_id,
    approval_reference, expires_at, created_by
  ) values (
    p_teen_user_id, p_parent_user_id, p_professional_user_id,
    btrim(p_approval_reference), p_expires_at, v_creator
  ) returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

-- Preserve the assignment mutation result before touching dependent sessions.
create or replace function public.revoke_bridge_case_assignment(
  p_assignment_id uuid,
  p_approval_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_revoked boolean := false;
begin
  if v_actor is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select role into v_actor_role from public.app_profiles where user_id = v_actor;
  if v_actor_role not in ('founder','admin') then
    raise exception 'founder or admin assignment authority required' using errcode = '42501';
  end if;
  if nullif(btrim(p_approval_reference), '') is null
     or char_length(btrim(p_approval_reference)) < 8
     or char_length(btrim(p_approval_reference)) > 200 then
    raise exception 'approval reference required' using errcode = '22023';
  end if;

  update public.bridge_case_assignments
  set status = 'revoked', revoked_at = now(), approval_reference = btrim(p_approval_reference), updated_at = now()
  where id = p_assignment_id and status = 'active';
  v_revoked := found;

  if v_revoked then
    update public.bridge_family_visit_sessions
    set state = 'revoked', ended_at = coalesce(ended_at, now()), updated_at = now()
    where assignment_id = p_assignment_id
      and state not in ('ready','declined','revoked','expired');
  end if;

  return v_revoked;
end;
$$;

-- Acknowledgement cannot advance while professional authority is stale.
create or replace function public.acknowledge_bridge_family_visit_session(p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_session public.bridge_family_visit_sessions%rowtype;
  v_assignment public.bridge_case_assignments%rowtype;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_session
  from public.bridge_family_visit_sessions
  where id = p_session_id
  for update;
  if not found or v_session.state <> 'awaiting_ack' or v_session.capture_mode <> 'none' then
    raise exception 'session is not awaiting visible acknowledgement' using errcode = '42501';
  end if;

  select * into v_assignment from public.bridge_case_assignments where id = v_session.assignment_id;
  if v_assignment.status <> 'active'
     or (v_assignment.expires_at is not null and v_assignment.expires_at <= now())
     or not exists (
       select 1 from public.bridge_professional_profiles
       where user_id = v_assignment.professional_user_id and verification_status = 'verified'
     ) then
    raise exception 'assignment authority is not current' using errcode = '42501';
  end if;

  if v_user = v_assignment.teen_user_id then
    update public.bridge_family_visit_sessions
    set teen_acknowledged_at = coalesce(teen_acknowledged_at, now()), updated_at = now()
    where id = p_session_id;
  elsif v_user = v_assignment.parent_user_id then
    update public.bridge_family_visit_sessions
    set parent_acknowledged_at = coalesce(parent_acknowledged_at, now()), updated_at = now()
    where id = p_session_id;
  elsif v_user = v_assignment.professional_user_id then
    update public.bridge_family_visit_sessions
    set professional_acknowledged_at = coalesce(professional_acknowledged_at, now()), updated_at = now()
    where id = p_session_id;
  else
    raise exception 'session participant required' using errcode = '42501';
  end if;

  update public.bridge_family_visit_sessions
  set state = 'active', started_at = coalesce(started_at, now()), updated_at = now()
  where id = p_session_id
    and state = 'awaiting_ack'
    and teen_acknowledged_at is not null
    and parent_acknowledged_at is not null
    and professional_acknowledged_at is not null;

  select * into v_session from public.bridge_family_visit_sessions where id = p_session_id;
  return v_session.state;
end;
$$;

-- Anyone participating may stop/decline. A suspended professional may not act
-- through professional authority, but teen/parent opt-out remains available.
create or replace function public.decline_bridge_family_visit_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_assignment public.bridge_case_assignments%rowtype;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select a.* into v_assignment
  from public.bridge_case_assignments a
  join public.bridge_family_visit_sessions s on s.assignment_id = a.id
  where s.id = p_session_id;
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id
        and exists (
          select 1 from public.bridge_professional_profiles
          where user_id = v_user and verification_status = 'verified'
        ) then v_role := 'professional';
  else raise exception 'session participant required' using errcode = '42501';
  end if;

  update public.bridge_family_visit_sessions
  set state = 'declined', declined_by_role = v_role,
      ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = p_session_id and state in ('awaiting_ack','active');
  return found;
end;
$$;

create or replace function public.end_bridge_family_visit_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_assignment public.bridge_case_assignments%rowtype;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select a.* into v_assignment
  from public.bridge_case_assignments a
  join public.bridge_family_visit_sessions s on s.assignment_id = a.id
  where s.id = p_session_id;
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;

  if v_user not in (v_assignment.teen_user_id, v_assignment.parent_user_id, v_assignment.professional_user_id) then
    raise exception 'session participant required' using errcode = '42501';
  end if;
  if v_user = v_assignment.professional_user_id
     and not exists (
       select 1 from public.bridge_professional_profiles
       where user_id = v_user and verification_status = 'verified'
     ) then
    raise exception 'professional authority is not current' using errcode = '42501';
  end if;

  update public.bridge_family_visit_sessions
  set state = 'reflection', ended_at = now(), updated_at = now()
  where id = p_session_id and state = 'active';
  return found;
end;
$$;

-- Markers and reflections require the assigned professional authority to remain
-- current. No raw text is accepted by either RPC.
create or replace function public.record_bridge_family_visit_marker(
  p_session_id uuid,
  p_marker_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_marker_id uuid;
  v_assignment public.bridge_case_assignments%rowtype;
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_marker_key not in ('felt_connected','felt_heard','needed_pause','support_offered','boundary_respected','repair_attempt','felt_pressured','want_human_review') then
    raise exception 'invalid marker' using errcode = '22023';
  end if;

  select a.* into v_assignment
  from public.bridge_case_assignments a
  join public.bridge_family_visit_sessions s on s.assignment_id = a.id
  join public.bridge_professional_profiles pp on pp.user_id = a.professional_user_id
  where s.id = p_session_id
    and s.state = 'active'
    and s.capture_mode = 'none'
    and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now())
    and pp.verification_status = 'verified';
  if not found then raise exception 'active visible session authority required' using errcode = '42501'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id then v_role := 'professional';
  else raise exception 'session participant required' using errcode = '42501';
  end if;

  insert into public.bridge_family_visit_markers (session_id, actor_user_id, actor_role, marker_key)
  values (p_session_id, v_user, v_role, p_marker_key)
  returning id into v_marker_id;
  return v_marker_id;
end;
$$;

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
  join public.bridge_professional_profiles pp on pp.user_id = a.professional_user_id
  where s.id = p_session_id
    and s.state in ('reflection','ready')
    and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now())
    and pp.verification_status = 'verified';
  if not found then raise exception 'reflection session authority required' using errcode = '42501'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id then v_role := 'professional';
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
    session_id, actor_user_id, actor_role, felt_heard, felt_comfortable,
    could_pause, connection_after, next_support, review_signal, updated_at
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

  return v_reflection_id;
end;
$$;

commit;
