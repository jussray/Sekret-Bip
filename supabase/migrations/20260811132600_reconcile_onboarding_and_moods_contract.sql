begin;

-- Reconcile the recorded production onboarding baseline with the richer contract
-- the current app already uses. Production currently has zero onboarding rows,
-- but fail closed rather than inventing a meaning for the legacy terminal stage.
do $$
begin
  if exists (
    select 1
    from public.user_onboarding_state
    where stage::text = 'offboarded'
  ) then
    raise exception 'onboarding reconciliation requires manual review for offboarded rows';
  end if;
end
$$;

update public.user_onboarding_state
set stage = case stage::text
  when 'signup' then 'signed_up'
  when 'welcome_seen' then 'signed_up'
  when 'age_confirmed' then 'age_verified'
  when 'parent_link_complete' then 'parent_linked'
  else stage::text
end::public.onboarding_stage
where stage::text in ('signup', 'welcome_seen', 'age_confirmed', 'parent_link_complete');

alter table public.user_onboarding_state
  alter column stage set default 'signed_up'::public.onboarding_stage,
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists age_bucket text,
  add column if not exists referral_source text,
  add column if not exists device_platform text,
  add column if not exists parent_link_code text,
  add column if not exists parent_linked_at timestamptz,
  add column if not exists linked_parent_id uuid,
  add column if not exists completed_at timestamptz,
  add column if not exists age_to_role_secs integer,
  add column if not exists role_to_name_secs integer,
  add column if not exists name_to_identity_secs integer;

update public.user_onboarding_state
set id = gen_random_uuid()
where id is null;

alter table public.user_onboarding_state
  alter column id set not null;

create unique index if not exists user_onboarding_state_id_key
  on public.user_onboarding_state(id);
create unique index if not exists user_onboarding_state_parent_link_code_key
  on public.user_onboarding_state(parent_link_code)
  where parent_link_code is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_onboarding_state'::regclass
      and conname = 'user_onboarding_state_linked_parent_id_fkey'
  ) then
    alter table public.user_onboarding_state
      add constraint user_onboarding_state_linked_parent_id_fkey
      foreign key (linked_parent_id) references auth.users(id);
  end if;
end
$$;

alter table public.user_onboarding_state enable row level security;
revoke all on table public.user_onboarding_state from public, anon, authenticated;
grant select, insert, update on table public.user_onboarding_state to authenticated;

drop policy if exists "users_own_onboarding" on public.user_onboarding_state;
drop policy if exists "service_read_all_onboarding" on public.user_onboarding_state;
drop policy if exists "Users can view own onboarding state" on public.user_onboarding_state;
drop policy if exists "Users can insert own onboarding state" on public.user_onboarding_state;
drop policy if exists "Users can update own onboarding state" on public.user_onboarding_state;
drop policy if exists "Service role can read all onboarding states" on public.user_onboarding_state;
drop policy if exists onboarding_state_permanent_owner_select on public.user_onboarding_state;
drop policy if exists onboarding_state_permanent_owner_insert on public.user_onboarding_state;
drop policy if exists onboarding_state_permanent_owner_update on public.user_onboarding_state;

create policy onboarding_state_permanent_owner_select
on public.user_onboarding_state
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

create policy onboarding_state_permanent_owner_insert
on public.user_onboarding_state
for insert
to authenticated
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

create policy onboarding_state_permanent_owner_update
on public.user_onboarding_state
for update
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

create or replace function public.onboarding_stage_rank(p_stage public.onboarding_stage)
returns integer
language sql
immutable
strict
set search_path = pg_catalog, public
as $$
  select case p_stage::text
    when 'pre_signup' then 0
    when 'signup' then 1
    when 'welcome_seen' then 1
    when 'signed_up' then 1
    when 'consent_complete' then 2
    when 'age_confirmed' then 3
    when 'age_verified' then 3
    when 'role_selected' then 4
    when 'name_set' then 5
    when 'identity_set' then 6
    when 'reflection_complete' then 7
    when 'parent_link_sent' then 8
    when 'parent_link_complete' then 9
    when 'parent_linked' then 9
    when 'parent_link_skipped' then 9
    when 'parent_setup_complete' then 10
    when 'activated' then 11
    when 'steady_state' then 12
    when 'offboarded' then 13
  end
$$;

create or replace function public.enforce_onboarding_state_transition()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_request_role text := coalesce((select auth.role()), '');
  v_stage_rank integer := public.onboarding_stage_rank(new.stage);
begin
  if v_stage_rank is null then
    raise exception 'unknown onboarding stage'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' and v_request_role = 'authenticated' then
    if new.stage <> 'signed_up'
       or new.role <> 'unknown'
       or new.activated_at is not null
       or new.activation_action is not null
       or new.completed_at is not null
       or new.parent_linked_at is not null
       or new.linked_parent_id is not null then
      raise exception 'invalid client onboarding insert baseline'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'onboarding user_id is immutable'
        using errcode = '23514';
    end if;

    if v_stage_rank < public.onboarding_stage_rank(old.stage) then
      raise exception 'onboarding stage cannot move backward'
        using errcode = '23514';
    end if;

    if old.role <> 'unknown' and new.role is distinct from old.role then
      raise exception 'onboarding role cannot change after assignment'
        using errcode = '23514';
    end if;

    if old.activated_at is not null and new.activated_at is null then
      raise exception 'activated_at cannot be cleared'
        using errcode = '23514';
    end if;

    if old.completed_at is not null and new.completed_at is null then
      raise exception 'completed_at cannot be cleared'
        using errcode = '23514';
    end if;
  end if;

  if v_stage_rank < public.onboarding_stage_rank('activated') then
    if new.activated_at is not null or new.activation_action is not null then
      raise exception 'activation metadata requires an activated stage'
        using errcode = '23514';
    end if;
  elsif new.activated_at is null then
    raise exception 'activated stage requires activated_at'
      using errcode = '23514';
  end if;

  if new.stage = 'steady_state' and new.completed_at is null then
    raise exception 'steady_state requires completed_at'
      using errcode = '23514';
  elsif new.stage <> 'steady_state' and new.completed_at is not null then
    raise exception 'completed_at requires steady_state'
      using errcode = '23514';
  end if;

  if new.age_bucket is not null
     and new.age_bucket not in ('13-15', '16-17', '18-19') then
    raise exception 'invalid onboarding age bucket'
      using errcode = '23514';
  end if;

  if new.device_platform is not null
     and char_length(new.device_platform) > 128 then
    raise exception 'onboarding device platform is too long'
      using errcode = '23514';
  end if;

  if new.referral_source is not null
     and char_length(new.referral_source) > 128 then
    raise exception 'onboarding referral source is too long'
      using errcode = '23514';
  end if;

  if new.activation_action is not null
     and (
       char_length(new.activation_action) > 64
       or new.activation_action !~ '^[a-z0-9_]+$'
     ) then
    raise exception 'invalid onboarding activation action'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists onboarding_state_transition_guard
on public.user_onboarding_state;
create trigger onboarding_state_transition_guard
before insert or update on public.user_onboarding_state
for each row execute function public.enforce_onboarding_state_transition();

-- Reconstruct the live moods contract on fresh databases. Production already
-- has this exact table shape from out-of-band bootstrap history.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'mood_level'
  ) then
    execute $ddl$
      create type public.mood_level as enum (
        'very_low', 'low', 'okay', 'good', 'great'
      )
    $ddl$;
  end if;
end
$$;

create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood public.mood_level not null,
  energy_level smallint check (energy_level between 1 and 5),
  anxiety_level smallint check (anxiety_level between 1 and 5),
  journal_excerpt text,
  is_private boolean not null default true,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moods_user_recorded_idx
  on public.moods(user_id, recorded_at desc);

alter table public.moods enable row level security;

drop policy if exists "moods select own" on public.moods;
create policy "moods select own"
on public.moods for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "moods insert own" on public.moods;
create policy "moods insert own"
on public.moods for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "moods update own" on public.moods;
create policy "moods update own"
on public.moods for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "moods delete own" on public.moods;
create policy "moods delete own"
on public.moods for delete to authenticated
using ((select auth.uid()) = user_id);

drop trigger if exists trg_moods_updated_at on public.moods;
create trigger trg_moods_updated_at
before update on public.moods
for each row execute function public.set_updated_at();

create or replace function public.handle_first_mood_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_count integer;
begin
  select count(*) into existing_count
  from public.moods
  where user_id = new.user_id;

  if existing_count > 1 then
    return new;
  end if;

  update public.user_onboarding_state
  set
    stage = 'activated',
    activated_at = now(),
    activation_action = 'first_mood_log',
    identity_to_activated_secs = extract(epoch from (now() - created_at))::integer
  where user_id = new.user_id
    and activated_at is null
    and stage not in ('activated', 'steady_state');

  return new;
end;
$$;

drop trigger if exists trg_first_mood_activation on public.moods;
create trigger trg_first_mood_activation
after insert on public.moods
for each row execute function public.handle_first_mood_log();

revoke all on function public.onboarding_stage_rank(public.onboarding_stage)
from public, anon, authenticated;
revoke all on function public.enforce_onboarding_state_transition()
from public, anon, authenticated;
revoke all on function public.handle_first_mood_log()
from public, anon, authenticated;

comment on table public.user_onboarding_state is
  'Client-reported onboarding progress for product routing and aggregate analysis. Not consent, verification, relationship, or authorization authority. Permanent owners may read and report forward progress only.';

comment on function public.enforce_onboarding_state_transition() is
  'Fails closed on non-baseline client inserts, cross-user rewrites, stage regression, assigned-role changes, inconsistent activation/completion state, timestamp clearing, and unbounded client-reported metadata.';

comment on function public.handle_first_mood_log() is
  'Fires on the first public.moods insert per user and idempotently advances onboarding to activated.';

commit;
