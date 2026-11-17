-- Se'kret Bip SECURITY DEFINER trigger behavior Phase 2 proof harness
--
-- Purpose:
--   Extend liveBehaviorVerified proof (security/supabase-trigger-baseline.json)
--   to the two trigger functions explicitly deferred by
--   trigger_behavior_phase1.sql's notCoveredThisPhase:
--     * public.cleanup_crew_relationship_access()
--     * public.record_bridge_signal_activity()
--
-- Why this needed a second real identity:
--   Both functions require two distinct real auth.users-referencing
--   identities on opposite sides of a relationship
--   (crew_members.user_id/member_user_id, crew_memberships.user_id/
--   member_id, crew_check_in_shares.owner_user_id/shared_with,
--   bridge_signals.teen_user_id all carry FOREIGN KEY ... REFERENCES
--   auth.users(id)). This Supabase project has exactly one real founder
--   auth.users row. Per explicit founder direction (2026-07-31: "Insert a
--   synthetic second auth.users row, rollback-contained"), this phase
--   inserts synthetic auth.users rows inside this same rollback-contained
--   transaction to supply that second (and, for the no-op guard check, a
--   third) identity.
--
-- Safety:
--   * Each synthetic auth.users insert supplies only id/created_at/
--     updated_at/aud/role/is_sso_user/is_anonymous -- no email, no
--     password, no PII.
--   * Live pg_catalog inspection (this session, 2026-07-31) confirmed
--     exactly two AFTER INSERT triggers fire on auth.users:
--     initialize_account_verification() and initialize_app_profile(). Both
--     are pure public-schema inserts with no pg_net / net.http_post / Edge
--     Function calls, so their side effects stay inside this transaction
--     and are undone by ROLLBACK along with everything else here.
--   * public.crew_members carries its own BEFORE INSERT/UPDATE guard
--     (public.guard_crew_member_write()) that requires a real auth.uid()
--     session this raw probe connection does not have. This probe sets
--     app.crew_acceptance = '1' (is_local = true, scoped to this
--     transaction only) before touching crew_members -- the same,
--     already-established bypass public.set_crew_connection_status() uses
--     for its own server-controlled crew_members writes. Nothing new is
--     introduced here.
--   * All synthetic rows are scoped to this transaction and tagged with
--     txid_current() for traceability.
--   * Final statement is ROLLBACK, never COMMIT. Post-run verification
--     (this session) confirmed auth.users count returned to 1 and zero
--     tagged rows remained in any touched table.
--
-- Scope (this phase only):
--   * public.cleanup_crew_relationship_access()
--   * public.record_bridge_signal_activity()
--
-- Deliberately NOT in this phase (unchanged from trigger_behavior_phase1.sql):
--   * public.trigger_safety_scan() -- pg_net side effect, never safe to
--     exercise with real content in a probe.
--   * public.initialize_account_verification(), public.initialize_app_profile(),
--     public.sync_app_profile_email_from_auth() -- still deferred as
--     directly-probed subjects; this phase's synthetic auth.users inserts
--     exercise the first two as an observed side effect only, not as an
--     asserted, scoped behavior check of those functions themselves.
--   * public.award_points_for_app_activity() -- documented live-only
--     catalog drift, lower value than canonical paths.
--   * public.enforce_onboarding_state_transition(), public.handle_first_mood_log()
--     -- not deployed live yet.

begin;

create temp table trigger_phase2_context (
  probe_user_id uuid not null,
  synthetic_user_id uuid not null,
  tag text not null
) on commit drop;

do $probe$
declare
  v_probe_user_id uuid;
  v_synthetic_user_id uuid;
begin
  select p.user_id into v_probe_user_id
  from public.app_profiles p
  where p.role in ('founder', 'admin')
  order by p.created_at
  limit 1;

  if v_probe_user_id is null then
    raise exception 'Trigger phase 2 probe requires one existing founder/admin fixture';
  end if;

  insert into auth.users (id, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  values (gen_random_uuid(), now(), now(), 'authenticated', 'authenticated', false, false)
  returning id into v_synthetic_user_id;

  insert into trigger_phase2_context (probe_user_id, synthetic_user_id, tag)
  values (v_probe_user_id, v_synthetic_user_id, 'trigphase2-' || txid_current()::text);
end
$probe$;

-- Matches public.set_crew_connection_status()'s own established bypass for
-- the crew_members write guard. is_local=true scopes this to the current
-- transaction only; it is discarded at ROLLBACK.
select set_config('app.crew_acceptance', '1', true);

create temp table trigger_phase2_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

-- ── cleanup_crew_relationship_access() ───────────────────────────────────

do $probe$
declare
  v_a uuid := (select probe_user_id from trigger_phase2_context);
  v_b uuid := (select synthetic_user_id from trigger_phase2_context);
  v_tag text := (select tag from trigger_phase2_context);
  v_check_in_a uuid;
  v_crew_a uuid;
  v_circle_a uuid;
  v_membership_count_before integer;
  v_membership_count_after integer;
  v_share_status_after text;
  v_circle_member_count_after integer;
begin
  -- Seed an accepted crew_members row A -> B: the row whose
  -- connection_status update fires the trigger.
  insert into public.crew_members (user_id, id, name, emoji, commitment, cadence, invite_code, connection_status, member_user_id, accepted_at)
  values (v_a, 900001, v_tag || '-crew-b', '🤝', 'daily check-in', 'daily', v_tag || '-code', 'accepted', v_b, now());

  -- Seed bidirectional legacy crew_memberships rows.
  insert into public.crew_memberships (user_id, member_id) values (v_a, v_b);
  insert into public.crew_memberships (user_id, member_id) values (v_b, v_a);

  select count(*) into v_membership_count_before from public.crew_memberships
  where (user_id = v_a and member_id = v_b) or (user_id = v_b and member_id = v_a);

  -- Seed an active check-in share A -> B.
  insert into public.crew_check_ins (owner_user_id, local_date, emoji)
  values (v_a, current_date, 'okay')
  returning id into v_check_in_a;

  insert into public.crew_check_in_shares (check_in_id, owner_user_id, shared_with, status)
  values (v_check_in_a, v_a, v_b, 'active');

  -- Seed a crew circle owned by A with B as a member.
  insert into public.crews (owner_user_id, name) values (v_a, v_tag || '-crew')
  returning id into v_crew_a;

  insert into public.circles (owner_user_id, kind, crew_id, name)
  values (v_a, 'crew', v_crew_a, v_tag || '-crew-circle')
  returning id into v_circle_a;

  insert into public.circle_members (circle_id, user_id, role) values (v_circle_a, v_b, 'member');

  -- Fire the trigger: transition A -> B's crew_members row to 'blocked'.
  update public.crew_members
  set connection_status = 'blocked'
  where user_id = v_a and id = 900001;

  select count(*) into v_membership_count_after from public.crew_memberships
  where (user_id = v_a and member_id = v_b) or (user_id = v_b and member_id = v_a);

  insert into trigger_phase2_results values (
    'cleanup_crew_relationship_access_deletes_crew_memberships_on_block',
    v_membership_count_before = 2 and v_membership_count_after = 0,
    format('crew_memberships rows before=%s after=%s, expected before=2 after=0', v_membership_count_before, v_membership_count_after)
  );

  select status into v_share_status_after from public.crew_check_in_shares
  where check_in_id = v_check_in_a and shared_with = v_b;

  insert into trigger_phase2_results values (
    'cleanup_crew_relationship_access_revokes_check_in_share_on_block',
    coalesce(v_share_status_after, 'null') = 'revoked',
    format('crew_check_in_shares.status after block = %s, expected revoked', coalesce(v_share_status_after, 'null'))
  );

  select count(*) into v_circle_member_count_after from public.circle_members
  where circle_id = v_circle_a and user_id = v_b;

  insert into trigger_phase2_results values (
    'cleanup_crew_relationship_access_deletes_crew_circle_membership_on_block',
    v_circle_member_count_after = 0,
    format('circle_members rows for B in A''s crew circle after block = %s, expected 0', v_circle_member_count_after)
  );
end
$probe$;

-- ── cleanup_crew_relationship_access() no-op guard ───────────────────────

do $probe$
declare
  v_a uuid := (select probe_user_id from trigger_phase2_context);
  v_tag text := (select tag from trigger_phase2_context);
  v_c uuid;
  v_membership_count integer;
begin
  -- A third synthetic identity, distinct from B, so this row does not
  -- collide with public.crew_members' one-relationship-per-owner unique
  -- constraint on (user_id, member_user_id) against the row seeded above.
  insert into auth.users (id, created_at, updated_at, aud, role, is_sso_user, is_anonymous)
  values (gen_random_uuid(), now(), now(), 'authenticated', 'authenticated', false, false)
  returning id into v_c;

  insert into public.crew_members (user_id, id, name, emoji, commitment, cadence, invite_code, connection_status, member_user_id, accepted_at)
  values (v_a, 900002, v_tag || '-crew-noop', '🤝', 'weekly check-in', 'weekly', v_tag || '-code-2', 'accepted', v_c, now());

  insert into public.crew_memberships (user_id, member_id) values (v_a, v_c) on conflict do nothing;

  -- "UPDATE OF connection_status" fires even when the assigned value is
  -- unchanged; the trigger's own old = new guard must no-op here.
  update public.crew_members
  set connection_status = 'accepted'
  where user_id = v_a and id = 900002;

  select count(*) into v_membership_count from public.crew_memberships
  where user_id = v_a and member_id = v_c;

  insert into trigger_phase2_results values (
    'cleanup_crew_relationship_access_noop_when_status_unchanged',
    v_membership_count = 1,
    format('crew_memberships row survived a same-value connection_status update: count=%s, expected 1', v_membership_count)
  );
end
$probe$;

-- ── record_bridge_signal_activity() ──────────────────────────────────────

do $probe$
declare
  v_a uuid := (select probe_user_id from trigger_phase2_context);
  v_signal_id bigint;
  v_event_user_id uuid;
  v_event_type text;
  v_meta jsonb;
begin
  insert into public.bridge_signals (teen_user_id, char_key, share_type, sent_at, response_preference)
  values (v_a, 'night', 'mood_summary', now(), 'listen')
  returning id into v_signal_id;

  select user_id, event_type, meta into v_event_user_id, v_event_type, v_meta
  from public.bip_events
  where event_type = 'bridge_shared' and (meta ->> 'sourceId') = v_signal_id::text;

  insert into trigger_phase2_results values (
    'record_bridge_signal_activity_creates_bip_event_with_correct_metadata',
    v_event_user_id = v_a
      and v_event_type = 'bridge_shared'
      and (v_meta ->> 'category') = 'connect'
      and (v_meta ->> 'route') = 'bridge'
      and (v_meta ->> 'receiptKey') = 'bridge_shared'
      and (v_meta ->> 'responsePreference') = 'listen',
    format('bip_events row for bridge_signals.id=%s: user_id=%s event_type=%s meta=%s', v_signal_id, coalesce(v_event_user_id::text, 'null'), coalesce(v_event_type, 'null'), coalesce(v_meta::text, 'null'))
  );
end
$probe$;

select check_name, passed, detail
from trigger_phase2_results
order by check_name;

rollback;
