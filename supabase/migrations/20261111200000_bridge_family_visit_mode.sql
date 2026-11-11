begin;

-- Bridge Family Visit Mode is a visible, reflection-only support flow for
-- court/CYS/foster-care-adjacent parent-child encounters.
--
-- Privacy invariants:
--   * no microphone, camera, transcript, passive capture, or raw free-text field;
--   * a visit cannot become active until teen, parent, and assigned professional
--     each acknowledge the visible session;
--   * professional authority is server-reviewed and cannot be self-selected;
--   * case assignment is separate from parent_links and does not widen ordinary
--     Parent Bridge visibility;
--   * raw structured markers/reflections stay private to the submitter and the
--     privileged summary service; parent/professional clients receive only their
--     audience-specific generated summary;
--   * the teen may inspect both generated summaries for transparency;
--   * assignment revocation/expiry immediately removes parent/professional read
--     access while retaining server-side audit history.

create table if not exists public.bridge_professional_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_kind text not null
    check (organization_kind in ('cys','court','casa','agency','other')),
  organization_label text not null
    check (char_length(btrim(organization_label)) between 2 and 120),
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','suspended','revoked')),
  review_reference text,
  verified_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bridge_case_assignments (
  id uuid primary key default gen_random_uuid(),
  teen_user_id uuid not null references auth.users(id) on delete cascade,
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null default 'family_visit_support'
    check (purpose = 'family_visit_support'),
  status text not null default 'active'
    check (status in ('active','revoked','expired')),
  approval_reference text not null
    check (char_length(btrim(approval_reference)) between 8 and 200),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (teen_user_id <> parent_user_id),
  check (teen_user_id <> professional_user_id),
  check (parent_user_id <> professional_user_id),
  check (expires_at is null or expires_at > starts_at)
);

create unique index if not exists bridge_case_assignments_active_unique
  on public.bridge_case_assignments (teen_user_id, parent_user_id, professional_user_id)
  where status = 'active';
create index if not exists bridge_case_assignments_teen_idx
  on public.bridge_case_assignments (teen_user_id, status, created_at desc);
create index if not exists bridge_case_assignments_parent_idx
  on public.bridge_case_assignments (parent_user_id, status, created_at desc);
create index if not exists bridge_case_assignments_professional_idx
  on public.bridge_case_assignments (professional_user_id, status, created_at desc);

create table if not exists public.bridge_family_visit_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.bridge_case_assignments(id) on delete cascade,
  state text not null default 'awaiting_ack'
    check (state in ('awaiting_ack','active','reflection','ready','declined','revoked','expired')),
  capture_mode text not null default 'none'
    check (capture_mode = 'none'),
  teen_acknowledged_at timestamptz,
  parent_acknowledged_at timestamptz,
  professional_acknowledged_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  declined_by_role text
    check (declined_by_role is null or declined_by_role in ('teen','parent','professional')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create index if not exists bridge_family_visit_sessions_assignment_idx
  on public.bridge_family_visit_sessions (assignment_id, created_at desc);

create table if not exists public.bridge_family_visit_markers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bridge_family_visit_sessions(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null check (actor_role in ('teen','parent','professional')),
  marker_key text not null check (marker_key in (
    'felt_connected',
    'felt_heard',
    'needed_pause',
    'support_offered',
    'boundary_respected',
    'repair_attempt',
    'felt_pressured',
    'want_human_review'
  )),
  created_at timestamptz not null default now()
);

create index if not exists bridge_family_visit_markers_session_idx
  on public.bridge_family_visit_markers (session_id, created_at);

create table if not exists public.bridge_family_visit_reflections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bridge_family_visit_sessions(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_role text not null check (actor_role in ('teen','parent','professional')),
  felt_heard text check (felt_heard is null or felt_heard in ('yes','somewhat','no','not_sure')),
  felt_comfortable text check (felt_comfortable is null or felt_comfortable in ('yes','somewhat','no','not_sure')),
  could_pause text check (could_pause is null or could_pause in ('yes','somewhat','no','not_sure')),
  connection_after text check (connection_after is null or connection_after in ('closer','same','more_distant','not_sure')),
  next_support text check (next_support is null or next_support in ('listen','space','reassurance','clear_plan','human_follow_up','none','not_sure')),
  review_signal text check (review_signal is null or review_signal in ('no_concern_observed','mixed','needs_human_review','insufficient_evidence')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, actor_user_id)
);

create table if not exists public.bridge_family_visit_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bridge_family_visit_sessions(id) on delete cascade,
  audience text not null check (audience in ('parent','professional')),
  content jsonb not null,
  limitations text not null,
  prompt_version text not null,
  model text,
  used_fallback boolean not null default false,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, audience),
  check (jsonb_typeof(content) = 'object')
);

alter table public.bridge_professional_profiles enable row level security;
alter table public.bridge_case_assignments enable row level security;
alter table public.bridge_family_visit_sessions enable row level security;
alter table public.bridge_family_visit_markers enable row level security;
alter table public.bridge_family_visit_reflections enable row level security;
alter table public.bridge_family_visit_summaries enable row level security;

revoke all on table public.bridge_professional_profiles from anon;
revoke all on table public.bridge_case_assignments from anon;
revoke all on table public.bridge_family_visit_sessions from anon;
revoke all on table public.bridge_family_visit_markers from anon;
revoke all on table public.bridge_family_visit_reflections from anon;
revoke all on table public.bridge_family_visit_summaries from anon;

revoke insert, update, delete on table public.bridge_professional_profiles from authenticated;
revoke insert, update, delete on table public.bridge_case_assignments from authenticated;
revoke insert, update, delete on table public.bridge_family_visit_sessions from authenticated;
revoke insert, update, delete on table public.bridge_family_visit_markers from authenticated;
revoke insert, update, delete on table public.bridge_family_visit_reflections from authenticated;
revoke insert, update, delete on table public.bridge_family_visit_summaries from authenticated;

grant select on table public.bridge_professional_profiles to authenticated;
grant select on table public.bridge_case_assignments to authenticated;
grant select on table public.bridge_family_visit_sessions to authenticated;
grant select on table public.bridge_family_visit_markers to authenticated;
grant select on table public.bridge_family_visit_reflections to authenticated;
grant select on table public.bridge_family_visit_summaries to authenticated;

-- A professional account may inspect only its own server-reviewed capability.
drop policy if exists bridge_professional_profiles_owner_select on public.bridge_professional_profiles;
create policy bridge_professional_profiles_owner_select
on public.bridge_professional_profiles for select to authenticated
using (
  user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Assignment metadata is visible only to its three named participants. Parent
-- and professional access disappears immediately after revocation/expiry;
-- the teen keeps read access to their own assignment history for transparency.
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
      and parent_user_id = auth.uid()
    )
    or (
      status = 'active'
      and (expires_at is null or expires_at > now())
      and professional_user_id = auth.uid()
      and exists (
        select 1 from public.bridge_professional_profiles pp
        where pp.user_id = auth.uid()
          and pp.verification_status = 'verified'
      )
    )
  )
);

-- Session metadata follows the same relationship boundary. There is never an
-- audio/video/transcript location because capture_mode is structurally `none`.
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
          and a.parent_user_id = auth.uid()
        )
        or (
          a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and a.professional_user_id = auth.uid()
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = auth.uid()
              and pp.verification_status = 'verified'
          )
        )
      )
  )
);

-- Raw structured inputs are not a shared dossier. A participant can inspect
-- only their own markers/reflection; the privileged backend reads all inputs
-- only to produce the minimized audience summaries.
drop policy if exists bridge_family_visit_markers_owner_select on public.bridge_family_visit_markers;
create policy bridge_family_visit_markers_owner_select
on public.bridge_family_visit_markers for select to authenticated
using (
  actor_user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists bridge_family_visit_reflections_owner_select on public.bridge_family_visit_reflections;
create policy bridge_family_visit_reflections_owner_select
on public.bridge_family_visit_reflections for select to authenticated
using (
  actor_user_id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Parent and professional summaries are mutually private. The teen may inspect
-- both generated summaries so Se'kret never creates an invisible AI dossier
-- about them.
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
          bridge_family_visit_summaries.audience = 'parent'
          and a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and a.parent_user_id = auth.uid()
        )
        or (
          bridge_family_visit_summaries.audience = 'professional'
          and a.status = 'active'
          and (a.expires_at is null or a.expires_at > now())
          and a.professional_user_id = auth.uid()
          and exists (
            select 1 from public.bridge_professional_profiles pp
            where pp.user_id = auth.uid()
              and pp.verification_status = 'verified'
          )
        )
      )
  )
);

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
    user_id,
    organization_kind,
    organization_label,
    verification_status,
    review_reference,
    verified_at,
    reviewed_by,
    updated_at
  ) values (
    p_target_user_id,
    p_organization_kind,
    btrim(p_organization_label),
    p_verification_status,
    btrim(p_review_reference),
    case when p_verification_status = 'verified' then now() else null end,
    v_reviewer,
    now()
  )
  on conflict (user_id) do update
  set organization_kind = excluded.organization_kind,
      organization_label = excluded.organization_label,
      verification_status = excluded.verification_status,
      review_reference = excluded.review_reference,
      verified_at = case when excluded.verification_status = 'verified' then now() else null end,
      reviewed_by = v_reviewer,
      updated_at = now();

  return p_verification_status;
end;
$$;

revoke execute on function public.review_bridge_professional_access(uuid,text,text,text,text) from public, anon;
grant execute on function public.review_bridge_professional_access(uuid,text,text,text,text) to authenticated;

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

  select role into v_creator_role
  from public.app_profiles
  where user_id = v_creator;
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
    where user_id = p_teen_user_id
      and account_side = 'teen'
      and onboarding_complete is true
  ) then
    raise exception 'verified teen-side account required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.app_profiles
    where user_id = p_parent_user_id
      and account_side = 'parent'
      and onboarding_complete is true
  ) then
    raise exception 'completed parent-side account required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.bridge_professional_profiles
    where user_id = p_professional_user_id
      and verification_status = 'verified'
  ) then
    raise exception 'verified professional required' using errcode = '42501';
  end if;

  update public.bridge_case_assignments
  set status = 'expired', updated_at = now()
  where status = 'active'
    and expires_at is not null
    and expires_at <= now();

  insert into public.bridge_case_assignments (
    teen_user_id,
    parent_user_id,
    professional_user_id,
    approval_reference,
    expires_at,
    created_by
  ) values (
    p_teen_user_id,
    p_parent_user_id,
    p_professional_user_id,
    btrim(p_approval_reference),
    p_expires_at,
    v_creator
  )
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

revoke execute on function public.create_bridge_case_assignment(uuid,uuid,uuid,text,timestamptz) from public, anon;
grant execute on function public.create_bridge_case_assignment(uuid,uuid,uuid,text,timestamptz) to authenticated;

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

  update public.bridge_family_visit_sessions
  set state = 'revoked', ended_at = coalesce(ended_at, now()), updated_at = now()
  where assignment_id = p_assignment_id
    and state not in ('ready','declined','revoked','expired');

  return found;
end;
$$;

revoke execute on function public.revoke_bridge_case_assignment(uuid,text) from public, anon;
grant execute on function public.revoke_bridge_case_assignment(uuid,text) to authenticated;

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

  insert into public.bridge_family_visit_sessions (
    assignment_id, state, capture_mode, created_by
  ) values (
    p_assignment_id, 'awaiting_ack', 'none', v_user
  ) returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke execute on function public.start_bridge_family_visit_session(uuid) from public, anon;
grant execute on function public.start_bridge_family_visit_session(uuid) to authenticated;

create or replace function public.acknowledge_bridge_family_visit_session(p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
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

  select * into v_assignment
  from public.bridge_case_assignments
  where id = v_session.assignment_id;
  if v_assignment.status <> 'active'
     or (v_assignment.expires_at is not null and v_assignment.expires_at <= now()) then
    raise exception 'assignment is not active' using errcode = '42501';
  end if;

  if v_user = v_assignment.teen_user_id then
    v_role := 'teen';
    update public.bridge_family_visit_sessions set teen_acknowledged_at = coalesce(teen_acknowledged_at, now()), updated_at = now() where id = p_session_id;
  elsif v_user = v_assignment.parent_user_id then
    v_role := 'parent';
    update public.bridge_family_visit_sessions set parent_acknowledged_at = coalesce(parent_acknowledged_at, now()), updated_at = now() where id = p_session_id;
  elsif v_user = v_assignment.professional_user_id
        and exists (
          select 1 from public.bridge_professional_profiles
          where user_id = v_user and verification_status = 'verified'
        ) then
    v_role := 'professional';
    update public.bridge_family_visit_sessions set professional_acknowledged_at = coalesce(professional_acknowledged_at, now()), updated_at = now() where id = p_session_id;
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

revoke execute on function public.acknowledge_bridge_family_visit_session(uuid) from public, anon;
grant execute on function public.acknowledge_bridge_family_visit_session(uuid) to authenticated;

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
  elsif v_user = v_assignment.professional_user_id then v_role := 'professional';
  else raise exception 'session participant required' using errcode = '42501';
  end if;

  update public.bridge_family_visit_sessions
  set state = 'declined', declined_by_role = v_role, ended_at = coalesce(ended_at, now()), updated_at = now()
  where id = p_session_id and state in ('awaiting_ack','active');

  return found;
end;
$$;

revoke execute on function public.decline_bridge_family_visit_session(uuid) from public, anon;
grant execute on function public.decline_bridge_family_visit_session(uuid) to authenticated;

create or replace function public.end_bridge_family_visit_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.bridge_family_visit_sessions s
  set state = 'reflection', ended_at = now(), updated_at = now()
  where s.id = p_session_id
    and s.state = 'active'
    and exists (
      select 1 from public.bridge_case_assignments a
      where a.id = s.assignment_id
        and v_user in (a.teen_user_id, a.parent_user_id, a.professional_user_id)
    );

  return found;
end;
$$;

revoke execute on function public.end_bridge_family_visit_session(uuid) from public, anon;
grant execute on function public.end_bridge_family_visit_session(uuid) to authenticated;

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
  where s.id = p_session_id
    and s.state = 'active'
    and s.capture_mode = 'none'
    and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now());
  if not found then raise exception 'active visible session required' using errcode = '42501'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id
        and exists (select 1 from public.bridge_professional_profiles where user_id = v_user and verification_status = 'verified') then v_role := 'professional';
  else raise exception 'session participant required' using errcode = '42501';
  end if;

  insert into public.bridge_family_visit_markers (session_id, actor_user_id, actor_role, marker_key)
  values (p_session_id, v_user, v_role, p_marker_key)
  returning id into v_marker_id;
  return v_marker_id;
end;
$$;

revoke execute on function public.record_bridge_family_visit_marker(uuid,text) from public, anon;
grant execute on function public.record_bridge_family_visit_marker(uuid,text) to authenticated;

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
    and s.state in ('reflection','ready')
    and a.status = 'active'
    and (a.expires_at is null or a.expires_at > now());
  if not found then raise exception 'reflection session required' using errcode = '42501'; end if;

  if v_user = v_assignment.teen_user_id then v_role := 'teen';
  elsif v_user = v_assignment.parent_user_id then v_role := 'parent';
  elsif v_user = v_assignment.professional_user_id
        and exists (select 1 from public.bridge_professional_profiles where user_id = v_user and verification_status = 'verified') then v_role := 'professional';
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

  return v_reflection_id;
end;
$$;

revoke execute on function public.submit_bridge_family_visit_reflection(uuid,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_bridge_family_visit_reflection(uuid,text,text,text,text,text,text) to authenticated;

comment on table public.bridge_professional_profiles is
  'Server-reviewed professional Bridge capability. It cannot be self-selected during public signup.';
comment on table public.bridge_case_assignments is
  'Founder/admin-approved family-visit assignment. Separate from parent_links and ordinary Parent Bridge consent.';
comment on table public.bridge_family_visit_sessions is
  'Visible three-party Family Visit Mode session. capture_mode is structurally none; all three participants must acknowledge before activation.';
comment on table public.bridge_family_visit_markers is
  'Structured participant-submitted visit markers only. No free text, audio, video, transcript, or passive monitoring.';
comment on table public.bridge_family_visit_reflections is
  'Structured participant reflections only. Raw rows are owner-readable and backend-summary input, not cross-audience content.';
comment on table public.bridge_family_visit_summaries is
  'Audience-separated generated summaries. Parent and professional cannot read each other’s summary; the teen may inspect both.';

commit;
