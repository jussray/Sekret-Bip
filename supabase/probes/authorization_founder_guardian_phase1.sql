-- Se'kret Bip founder/guardian authorization Phase 1 proof harness
--
-- Purpose:
--   Verify the highest-blast authenticated authorization boundary without
--   exposing user identifiers or retaining probe writes.
--
-- Safety:
--   * Uses one existing privileged profile only through internal subqueries.
--   * Returns no user IDs, email addresses, private content, or secrets.
--   * Creates synthetic Control Room/audit rows inside one transaction.
--   * Final statement is ROLLBACK, never COMMIT.
--
-- Expected checks:
--   1. normal authenticated users cannot use founder/guardian admin paths;
--   2. a non-anonymous founder can use intended privileged paths;
--   3. the same profile with an anonymous-authenticated JWT is denied;
--   4. anon has no table privileges on audit/Control Room tables.

begin;

create temp table phase1_context (
  founder_user_id uuid not null,
  normal_user_id uuid not null,
  issue_fingerprint text not null,
  audit_event_type text not null
) on commit drop;

insert into phase1_context(founder_user_id, normal_user_id, issue_fingerprint, audit_event_type)
select
  p.user_id,
  gen_random_uuid(),
  'phase1-founder-guardian-' || txid_current()::text,
  'phase1_founder_guardian_' || txid_current()::text
from public.app_profiles p
where p.role in ('founder', 'admin')
  and p.can_view_audits = true
  and p.can_manage_app = true
order by p.created_at
limit 1;

do $probe$
begin
  if not exists (select 1 from phase1_context) then
    raise exception 'Phase 1 probe requires one existing non-anonymous founder/admin fixture';
  end if;
end
$probe$;

grant select on phase1_context to authenticated;

insert into public.control_room_issues(
  fingerprint,
  source,
  category,
  severity,
  status,
  title,
  summary,
  trust_level
)
select
  issue_fingerprint,
  'phase1_probe',
  'rls',
  'warning',
  'open',
  'Synthetic founder authorization proof',
  'Rollback-contained synthetic issue',
  'system'
from phase1_context;

insert into public.audit_events(user_id, event_type, screen, severity, message, metadata)
select
  null,
  audit_event_type,
  'phase1-probe',
  'warning',
  'Rollback-contained synthetic audit event',
  '{}'::jsonb
from phase1_context;

create temp table phase1_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on phase1_results to authenticated;

-- Normal authenticated user.
select set_config(
  'request.jwt.claim.sub',
  (select normal_user_id::text from phase1_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select normal_user_id::text from phase1_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

insert into phase1_results values
  ('normal_is_not_founder', not public.is_founder(), 'Normal user is not recognized as founder'),
  ('normal_cannot_manage_guardian_reviews', not public.can_manage_guardian_reviews(), 'Normal user cannot manage guardian reviews'),
  (
    'normal_cannot_read_control_room',
    (select count(*) = 0 from public.control_room_issues where fingerprint = (select issue_fingerprint from phase1_context)),
    'Normal user cannot read founder Control Room rows'
  ),
  (
    'normal_cannot_read_audit_events',
    (select count(*) = 0 from public.audit_events where event_type = (select audit_event_type from phase1_context)),
    'Normal user cannot read founder audit rows'
  );

do $probe$
begin
  begin
    perform * from public.list_guardian_verification_queue();
    insert into phase1_results values ('normal_guardian_queue_denied', false, 'Normal user unexpectedly listed guardian queue');
  exception when insufficient_privilege then
    insert into phase1_results values ('normal_guardian_queue_denied', true, 'Normal user receives 42501 from guardian queue');
  end;

  begin
    perform public.review_guardian_verification(gen_random_uuid(), true, null);
    insert into phase1_results values ('normal_guardian_review_denied', false, 'Normal user unexpectedly reached guardian review mutation');
  exception when insufficient_privilege then
    insert into phase1_results values ('normal_guardian_review_denied', true, 'Normal user receives 42501 before target validation');
  end;

  begin
    perform public.upsert_control_room_issue(
      'phase1-normal-denied-' || txid_current()::text,
      'phase1_probe',
      'rls',
      'warning',
      'open',
      'Normal user attempt',
      'Must be denied',
      null,
      'phase1-probe',
      null,
      null,
      '{}'::jsonb
    );
    insert into phase1_results values ('normal_control_room_upsert_denied', false, 'Normal user unexpectedly wrote a Control Room issue');
  exception when insufficient_privilege then
    insert into phase1_results values ('normal_control_room_upsert_denied', true, 'Normal user receives 42501 from Control Room upsert');
  end;
end
$probe$;

reset role;

-- Intended non-anonymous founder path.
select set_config(
  'request.jwt.claim.sub',
  (select founder_user_id::text from phase1_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select founder_user_id::text from phase1_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

insert into phase1_results values
  ('founder_is_founder', public.is_founder(), 'Non-anonymous founder is recognized'),
  ('founder_can_manage_guardian_reviews', public.can_manage_guardian_reviews(), 'Non-anonymous founder can manage guardian reviews'),
  (
    'founder_can_read_control_room',
    (select count(*) = 1 from public.control_room_issues where fingerprint = (select issue_fingerprint from phase1_context)),
    'Founder can read the synthetic Control Room row'
  ),
  (
    'founder_can_read_audit_events',
    (select count(*) = 1 from public.audit_events where event_type = (select audit_event_type from phase1_context)),
    'Founder can read the synthetic audit row'
  ),
  (
    'founder_can_list_guardian_queue',
    (select count(*) >= 0 from public.list_guardian_verification_queue()),
    'Founder can execute the guardian review queue RPC even when the queue is empty'
  );

do $probe$
begin
  begin
    perform public.review_guardian_verification(gen_random_uuid(), true, null);
    insert into phase1_results values ('founder_review_reaches_target_validation', false, 'Unexpected guardian review result for nonexistent target');
  exception when invalid_parameter_value then
    insert into phase1_results values ('founder_review_reaches_target_validation', true, 'Founder passes authorization and reaches target validation');
  when insufficient_privilege then
    insert into phase1_results values ('founder_review_reaches_target_validation', false, 'Founder was incorrectly denied before target validation');
  end;
end
$probe$;

insert into phase1_results
select
  'founder_control_room_upsert_succeeds',
  public.upsert_control_room_issue(
    'phase1-founder-allowed-' || txid_current()::text,
    'phase1_probe',
    'rls',
    'warning',
    'open',
    'Founder proof',
    'Rollback-contained founder issue',
    null,
    'phase1-probe',
    null,
    null,
    '{}'::jsonb
  ) is not null,
  'Founder can write through the intended elevated RPC';

reset role;

-- Same privileged profile, but an anonymous-authenticated JWT.
select set_config(
  'request.jwt.claim.sub',
  (select founder_user_id::text from phase1_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select founder_user_id::text from phase1_context),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;

insert into phase1_results values
  ('anonymous_founder_rejected_by_founder_helper', not public.is_founder(), 'Anonymous-authenticated session is never founder-authorized'),
  ('anonymous_founder_rejected_by_guardian_helper', not public.can_manage_guardian_reviews(), 'Anonymous-authenticated session cannot manage guardian reviews'),
  (
    'anonymous_founder_cannot_read_control_room',
    (select count(*) = 0 from public.control_room_issues where fingerprint = (select issue_fingerprint from phase1_context)),
    'Anonymous-authenticated session cannot read Control Room rows'
  ),
  (
    'anonymous_founder_cannot_read_audit_events',
    (select count(*) = 0 from public.audit_events where event_type = (select audit_event_type from phase1_context)),
    'Anonymous-authenticated session cannot read audit rows'
  );

do $probe$
begin
  begin
    perform * from public.list_guardian_verification_queue();
    insert into phase1_results values ('anonymous_guardian_queue_denied', false, 'Anonymous-authenticated session unexpectedly listed guardian queue');
  exception when insufficient_privilege then
    insert into phase1_results values ('anonymous_guardian_queue_denied', true, 'Anonymous-authenticated session receives 42501 from guardian queue');
  end;

  begin
    perform public.upsert_control_room_issue(
      'phase1-anonymous-denied-' || txid_current()::text,
      'phase1_probe',
      'rls',
      'warning',
      'open',
      'Anonymous founder attempt',
      'Must be denied',
      null,
      'phase1-probe',
      null,
      null,
      '{}'::jsonb
    );
    insert into phase1_results values ('anonymous_control_room_upsert_denied', false, 'Anonymous-authenticated session unexpectedly wrote a Control Room issue');
  exception when insufficient_privilege then
    insert into phase1_results values ('anonymous_control_room_upsert_denied', true, 'Anonymous-authenticated session receives 42501 from Control Room upsert');
  end;

  begin
    insert into public.audit_events(user_id, event_type, screen, severity, message, metadata)
    values ((select founder_user_id from phase1_context), 'phase1_anonymous_insert', 'phase1-probe', 'warning', 'Must be denied', '{}'::jsonb);
    insert into phase1_results values ('anonymous_audit_insert_denied', false, 'Anonymous-authenticated session unexpectedly inserted an audit event');
  exception when insufficient_privilege then
    insert into phase1_results values ('anonymous_audit_insert_denied', true, 'Anonymous-authenticated session is denied by audit insert policy');
  end;
end
$probe$;

reset role;

insert into phase1_results
select
  'anon_table_grants_removed',
  not exists (
    select 1
    from unnest(array[
      'public.audit_events',
      'public.control_room_fingerprints',
      'public.control_room_issue_events',
      'public.control_room_issue_history',
      'public.control_room_issues',
      'public.control_room_releases'
    ]) as target(table_name)
    where has_table_privilege('anon', target.table_name, 'SELECT')
       or has_table_privilege('anon', target.table_name, 'INSERT')
       or has_table_privilege('anon', target.table_name, 'UPDATE')
       or has_table_privilege('anon', target.table_name, 'DELETE')
  ),
  'Unauthenticated anon role has no audit or Control Room table privileges';

insert into phase1_results values
  (
    'founder_helper_execute_grants_are_explicit',
    not has_function_privilege('anon', 'public.is_founder()', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.is_founder()', 'EXECUTE')
      and has_function_privilege('service_role', 'public.is_founder()', 'EXECUTE'),
    'Founder helper is executable only by authenticated and service-role callers'
  );

select check_name, passed, detail
from phase1_results
order by check_name;

rollback;
