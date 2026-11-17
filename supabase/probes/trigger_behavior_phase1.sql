-- Se'kret Bip SECURITY DEFINER trigger behavior Phase 1 proof harness
--
-- Purpose:
--   Close the "liveBehaviorVerified: false" gap in
--   security/supabase-trigger-baseline.json for the first bounded slice of
--   pure-public-schema trigger functions: no external effects (no pg_net /
--   Edge Function calls), no auth.users writes. Structural coverage and
--   read-only live catalog parity already exist for all 12 reviewed
--   functions (test/supabase-trigger-structure.test.mjs); this proves four
--   of them actually behave as documented against the live database.
--
-- Scope (this phase only):
--   * public.apply_point_transaction()
--   * public.handle_bip_event_points()
--   * public.enforce_circle_anonymity()
--   * public.auto_resolve_issue_on_event_resolve()
--
-- Deliberately NOT in this phase:
--   * public.trigger_safety_scan() -- fires a real net.http_post to the
--     deployed safety-scan Edge Function. pg_net requests are queued
--     outside the enclosing transaction and are NOT undone by ROLLBACK, so
--     this function must never be exercised with real content in a probe.
--     A future probe may assert only its early-return guards (empty
--     content, missing user_id) without ever supplying scannable content.
--   * public.initialize_account_verification(),
--     public.initialize_app_profile(),
--     public.sync_app_profile_email_from_auth() -- attached to auth.users
--     INSERT/UPDATE. Behaviorally proving these requires writing to
--     auth.users, a different risk class from ordinary public-schema rows;
--     out of scope until that is explicitly authorized.
--   * public.cleanup_crew_relationship_access(),
--     public.record_bridge_signal_activity() -- deferred to the next
--     bounded slice, not because they are unsafe, to keep this phase small
--     and reviewable.
--   * public.award_points_for_app_activity() -- documented live-only
--     catalog drift (repositoryExpected: false); behavior proof for a
--     function slated for retirement is lower value than for canonical
--     paths.
--   * public.enforce_onboarding_state_transition(),
--     public.handle_first_mood_log() -- not deployed live yet
--     (deployedLive: false in the baseline); cannot be behaviorally probed
--     against a project where they do not exist.
--
-- Safety:
--   * Uses one existing founder/admin profile's user_id only, through a
--     read-only subquery. No new auth.users rows are created.
--   * All synthetic rows are scoped to this transaction and identified by
--     txid_current() for traceability.
--   * Final statement is ROLLBACK, never COMMIT.

begin;

create temp table trigger_phase1_context (
  probe_user_id uuid not null,
  tag text not null
) on commit drop;

insert into trigger_phase1_context(probe_user_id, tag)
select p.user_id, 'trigphase1-' || txid_current()::text
from public.app_profiles p
where p.role in ('founder', 'admin')
order by p.created_at
limit 1;

do $probe$
begin
  if not exists (select 1 from trigger_phase1_context) then
    raise exception 'Trigger phase 1 probe requires one existing founder/admin fixture';
  end if;
end
$probe$;

create temp table trigger_phase1_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

-- ── apply_point_transaction() ────────────────────────────────────────────

do $probe$
declare
  v_before integer;
  v_after integer;
begin
  -- coalesce() only helps a NULL *column value*; when zero rows match the
  -- WHERE clause, a plain SELECT INTO leaves the target variable NULL
  -- regardless of coalesce() inside the select list. Wrap the whole lookup
  -- in a scalar subquery so coalesce() sees a "no row" NULL and can zero it.
  select coalesce((
    select available from public.point_balances
    where user_id = (select probe_user_id from trigger_phase1_context)
  ), 0) into v_before;

  insert into public.point_transactions(user_id, amount, reason, transaction_type, source_type, source_id)
  values ((select probe_user_id from trigger_phase1_context), 7, 'trigger-phase1 probe', 'earn', 'trigger_phase1_probe', (select tag from trigger_phase1_context) || '-a');

  insert into public.point_transactions(user_id, amount, reason, transaction_type, source_type, source_id)
  values ((select probe_user_id from trigger_phase1_context), 3, 'trigger-phase1 probe', 'earn', 'trigger_phase1_probe', (select tag from trigger_phase1_context) || '-b');

  select coalesce((
    select available from public.point_balances
    where user_id = (select probe_user_id from trigger_phase1_context)
  ), 0) into v_after;

  insert into trigger_phase1_results values (
    'apply_point_transaction_accumulates_available',
    coalesce(v_after - v_before, -1) = 10,
    format('point_balances.available moved by %s, expected 10', coalesce((v_after - v_before)::text, 'null'))
  );
end
$probe$;

-- ── handle_bip_event_points() ────────────────────────────────────────────

do $probe$
declare
  v_event_id bigint;
  v_points integer;
  v_unknown_event_id bigint;
  v_unknown_points_count integer;
begin
  insert into public.bip_events(user_id, event_type, occurred_at)
  values ((select probe_user_id from trigger_phase1_context), 'mood_logged', now())
  returning id into v_event_id;

  select points into v_points
  from public.point_transactions
  where source_type = 'app_action' and source_id = v_event_id::text;

  insert into trigger_phase1_results values (
    'handle_bip_event_points_awards_known_event_type',
    coalesce(v_points, -1) = 2,
    format('mood_logged awarded %s points, expected 2', coalesce(v_points::text, 'null'))
  );

  insert into public.bip_events(user_id, event_type, occurred_at)
  values ((select probe_user_id from trigger_phase1_context), 'trigger_phase1_unknown_event', now())
  returning id into v_unknown_event_id;

  select count(*) into v_unknown_points_count
  from public.point_transactions
  where source_type = 'app_action' and source_id = v_unknown_event_id::text;

  insert into trigger_phase1_results values (
    'handle_bip_event_points_skips_unknown_event_type',
    v_unknown_points_count = 0,
    format('unrecognized event_type produced %s point_transactions rows, expected 0', v_unknown_points_count)
  );
end
$probe$;

-- ── enforce_circle_anonymity() ───────────────────────────────────────────

do $probe$
declare
  v_public_circle uuid;
  v_friends_circle uuid;
begin
  insert into public.circles(owner_user_id, kind, name)
  values ((select probe_user_id from trigger_phase1_context), 'public', 'trigger-phase1 public circle')
  returning id into v_public_circle;

  insert into public.circles(owner_user_id, kind, name)
  values ((select probe_user_id from trigger_phase1_context), 'friends', 'trigger-phase1 friends circle')
  returning id into v_friends_circle;

  begin
    insert into public.posts(author_user_id, circle_id, body, is_identity_revealed)
    values ((select probe_user_id from trigger_phase1_context), v_public_circle, 'trigger-phase1 probe body', true);
    insert into trigger_phase1_results values (
      'enforce_circle_anonymity_blocks_public_reveal',
      false,
      'Revealed-identity post on a public circle was unexpectedly accepted'
    );
  exception when raise_exception then
    insert into trigger_phase1_results values (
      'enforce_circle_anonymity_blocks_public_reveal',
      true,
      'public circle post with is_identity_revealed=true was rejected'
    );
  end;

  begin
    insert into public.posts(author_user_id, circle_id, body, is_identity_revealed)
    values ((select probe_user_id from trigger_phase1_context), v_friends_circle, 'trigger-phase1 probe body', true);
    insert into trigger_phase1_results values (
      'enforce_circle_anonymity_allows_friends_reveal',
      true,
      'friends circle post with is_identity_revealed=true was accepted as expected'
    );
  exception when raise_exception then
    insert into trigger_phase1_results values (
      'enforce_circle_anonymity_allows_friends_reveal',
      false,
      'friends circle post with is_identity_revealed=true was unexpectedly rejected'
    );
  end;
end
$probe$;

-- ── auto_resolve_issue_on_event_resolve() ────────────────────────────────

do $probe$
declare
  v_issue_id uuid;
  v_event_a uuid;
  v_event_b uuid;
  v_status_after_partial text;
  v_status_after_full text;
begin
  insert into public.control_room_issues(fingerprint, source, category, severity, status, title, summary, trust_level)
  values (
    (select tag from trigger_phase1_context) || '-issue',
    'trigger_phase1_probe', 'runtime', 'warning', 'open',
    'trigger-phase1 synthetic issue', 'Rollback-contained', 'system'
  )
  returning id into v_issue_id;

  insert into public.audit_events(user_id, event_type, severity, message, resolved)
  values (null, (select tag from trigger_phase1_context) || '-event-a', 'warning', 'trigger-phase1 probe', false)
  returning id into v_event_a;

  insert into public.audit_events(user_id, event_type, severity, message, resolved)
  values (null, (select tag from trigger_phase1_context) || '-event-b', 'warning', 'trigger-phase1 probe', false)
  returning id into v_event_b;

  insert into public.control_room_issue_events(issue_id, event_id) values (v_issue_id, v_event_a);
  insert into public.control_room_issue_events(issue_id, event_id) values (v_issue_id, v_event_b);

  update public.audit_events set resolved = true where id = v_event_a;

  select status into v_status_after_partial from public.control_room_issues where id = v_issue_id;

  insert into trigger_phase1_results values (
    'auto_resolve_issue_stays_open_on_partial_resolve',
    coalesce(v_status_after_partial, 'null') = 'open',
    format('issue status after resolving 1 of 2 linked events was %s, expected open', coalesce(v_status_after_partial, 'null'))
  );

  update public.audit_events set resolved = true where id = v_event_b;

  select status into v_status_after_full from public.control_room_issues where id = v_issue_id;

  insert into trigger_phase1_results values (
    'auto_resolve_issue_resolves_on_full_resolve',
    coalesce(v_status_after_full, 'null') = 'resolved',
    format('issue status after resolving 2 of 2 linked events was %s, expected resolved', coalesce(v_status_after_full, 'null'))
  );
end
$probe$;

select check_name, passed, detail
from trigger_phase1_results
order by check_name;

rollback;
