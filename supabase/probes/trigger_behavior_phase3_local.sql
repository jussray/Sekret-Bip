-- Se'kret Bip trigger Phase 3: disposable local-Supabase behavioral checks.
-- Exact-head proof ONLY in ephemeral Supabase migration replay. Never run
-- on production or a database containing actual teen or family identities.
\set ON_ERROR_STOP on
begin;
set local statement_timeout = '20s';

-- Auth insertion/update can fan out to other triggers. Refuse this probe if
-- ANY currently attached auth.users function mentions external network calls.
do $preflight$
begin
  if exists (
    select 1
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and pg_get_functiondef(p.oid) ~* '(net[.]|http_post|http_get|pg_net|dblink|http_request)'
  ) then
    raise exception 'External side effect found on auth.users trigger: unsafe to probe';
  end if;
end
$preflight$;

create temporary table phase3_subject(user_id uuid primary key) on commit drop;

do $proof$
declare
  v_user uuid := gen_random_uuid();
  v_email text := 'phase3-' || v_user::text || '@example.invalid';
  v_found boolean;
  v_denied boolean;
begin
  -- No password, personal email, or live subject. The whole transaction
  -- rolls back. This exercises both auth.users AFTER INSERT handlers.
  insert into auth.users (id, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  values (v_user, now(), now(), 'authenticated', 'authenticated', false, false);
  insert into phase3_subject(user_id) values (v_user);

  select exists (
    select 1 from public.account_verification
    where user_id = v_user and verification_state = 'UNVERIFIED'
      and parent_link_state = 'none'
  ) into v_found;
  if not v_found then
    raise exception 'initialize_account_verification did not create default verification state';
  end if;

  select exists (
    select 1 from public.app_profiles
    where user_id = v_user and onboarding_complete = false
  ) into v_found;
  if not v_found then
    raise exception 'initialize_app_profile did not create a non-completed profile';
  end if;

  -- Update the synthetic auth identity and prove metadata-only sync.
  update auth.users
     set email = v_email,
         raw_user_meta_data = '{"account_side":"teen","username":"CI Fixture"}'::jsonb
   where id = v_user;

  select exists (
    select 1 from public.app_profiles
    where user_id = v_user and email = v_email and account_side = 'teen'
  ) into v_found;
  if not v_found then
    raise exception 'sync_app_profile_email_from_auth did not synchronize metadata';
  end if;

  -- Prove onboarding cannot regress in the forward-only state machine.
  -- Signup can already create the onboarding baseline. Preserve it instead
  -- of duplicating the primary key, then assert the correct starting state.
  insert into public.user_onboarding_state(user_id, stage, role)
  select v_user, 'signed_up', 'unknown'
  where not exists (
    select 1 from public.user_onboarding_state where user_id = v_user
  );
  select exists (
    select 1 from public.user_onboarding_state
    where user_id = v_user and stage = 'signed_up' and role = 'unknown'
  ) into v_found;
  if not v_found then
    raise exception 'synthetic signup onboarding baseline was not valid';
  end if;

  update public.user_onboarding_state set stage = 'age_verified'
  where user_id = v_user;

  v_denied := false;
  begin
    update public.user_onboarding_state set stage = 'signed_up'
    where user_id = v_user;
  exception when check_violation then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'enforce_onboarding_state_transition permitted regression';
  end if;

  -- First mood must activate exactly this synthetic user's onboarding row.
  insert into public.moods (user_id, mood, journal_excerpt)
  values (v_user, 'okay', null);

  select exists (
    select 1 from public.user_onboarding_state
    where user_id = v_user
      and stage = 'activated'
      and activated_at is not null
      and activation_action = 'first_mood_log'
  ) into v_found;
  if not v_found then
    raise exception 'handle_first_mood_log did not activate first mood';
  end if;

  raise notice 'PHASE3_PASS: isolated auth verification, profile creation/sync, onboarding ratchet, and mood activation';
end
$proof$;

-- Strictly test the scanner's safe no-identity early-return only. A trigger
-- on this synthetic temp table has no author_user_id or user_id, so the
-- network-effect path is unreachable. Never test real content or pg_net here.
create temporary table public_circle_posts (
  id uuid primary key default gen_random_uuid(),
  fixture_marker text
) on commit drop;
create trigger phase3_safe_scan_guard
after insert on public_circle_posts
for each row execute function public.trigger_safety_scan();
insert into public_circle_posts(fixture_marker) values ('no identity, no content, local-only');
do $proof$
begin
  if (select count(*) from public_circle_posts) <> 1 then
    raise exception 'trigger_safety_scan safe early return failed';
  end if;
  raise notice 'PHASE3_PASS: scanner no-identity early-return guard (external scan path NOT claimed)';
end
$proof$;

rollback;
