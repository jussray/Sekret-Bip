-- ============================================================
-- Onboarding State Machine — Se'kret Bip
-- Migration: 20260718000000_onboarding_state.sql
-- ============================================================
-- Tracks each user through the Se'kret Bip onboarding flow.
-- One row per user. Stage advances forward only.
-- ============================================================

create type onboarding_stage as enum (
  'pre_signup',
  'signed_up',
  'consent_complete',
  'age_verified',
  'role_selected',        -- identity.tsx: teen | parent selected
  'name_set',             -- name.tsx: display name set
  'identity_set',         -- alias kept for backwards compat
  'reflection_complete',  -- reflection.tsx: teen reflection done
  'parent_link_sent',     -- teen dispatched invite code to parent
  'parent_linked',        -- parent successfully linked a teen
  'parent_link_skipped',  -- parent chose to link later
  'parent_setup_complete',-- parent finished profile setup
  'activated',            -- first core action completed
  'steady_state'          -- fully onboarded, using normally
);

create type user_role as enum ('teen', 'parent', 'unknown');

create table if not exists public.user_onboarding_state (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  stage           onboarding_stage not null default 'signed_up',
  role            user_role not null default 'unknown',

  -- Activation tracking
  activated_at       timestamptz,
  activation_action  text,  -- 'first_mood_log' | 'first_journal_entry' | 'first_post'
                             -- 'first_bridge_message' | 'first_checkin_viewed'

  -- Segmentation signals captured during onboarding
  age_bucket         text,  -- '13-15' | '16-17' | '18-19'
  referral_source    text,  -- utm_source or app store referral
  device_platform    text,  -- 'ios' | 'android'

  -- Parent link
  parent_link_code   text unique,
  parent_linked_at   timestamptz,
  linked_parent_id   uuid references auth.users(id),

  -- Timestamps
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz,  -- set when stage = 'steady_state'

  -- Funnel timing (seconds between key stage transitions)
  -- Used by the OODA Observe layer / founder control room
  signup_to_consent_secs      integer,
  consent_to_age_secs         integer,
  age_to_role_secs            integer,
  role_to_name_secs           integer,
  name_to_identity_secs       integer,
  identity_to_activated_secs  integer,

  constraint one_state_per_user unique (user_id)
);

-- ── Trigger: auto-update updated_at ──────────────────────────
create or replace function update_onboarding_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger onboarding_state_updated_at
  before update on public.user_onboarding_state
  for each row execute function update_onboarding_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.user_onboarding_state enable row level security;

create policy "Users can view own onboarding state"
  on public.user_onboarding_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own onboarding state"
  on public.user_onboarding_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding state"
  on public.user_onboarding_state for update
  using (auth.uid() = user_id);

-- Service role reads all rows for control room dashboards
create policy "Service role can read all onboarding states"
  on public.user_onboarding_state for select
  using (auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────
create index idx_onboarding_stage       on public.user_onboarding_state(stage);
create index idx_onboarding_role        on public.user_onboarding_state(role);
create index idx_onboarding_created_at  on public.user_onboarding_state(created_at desc);
create index idx_onboarding_activated_at
  on public.user_onboarding_state(activated_at desc)
  where activated_at is not null;

comment on table public.user_onboarding_state is
  'Tracks each Se''kret Bip user through the onboarding state machine. '
  'One row per user. Stage is forward-only. '
  'Funnel timing columns feed OODA loop analysis in the founder control room.';
