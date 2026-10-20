import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselinePath = path.join(root, 'security', 'supabase-authorization-baseline.json');
const probePath = path.join(root, 'supabase', 'probes', 'authorization_phase0.sql');
const founderProbePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_founder_guardian_phase1.sql',
);
const docPath = path.join(root, 'docs', 'security', 'SUPABASE_AUTHORIZATION_PHASE0.md');

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const probe = fs.readFileSync(probePath, 'utf8');
const founderProbe = fs.readFileSync(founderProbePath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');

test('authorization baseline records the latest verified live migration and keeps L4 closed', () => {
  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.project.ref, 'tbsevonvegdnlyjgplmm');
  assert.equal(baseline.project.latestLiveMigration.version, '20260713052603');
  assert.equal(baseline.project.latestLiveMigration.name, 'harden_notification_delivery_ledger');
  assert.equal(baseline.scope.productionDdlApplied, true);
  assert.equal(baseline.scope.productionDataRetained, false);
  assert.equal(baseline.releaseGate.l4SchemaAllowed, false);
});

test('remaining no-policy configuration and operational tables are explicitly service-role-only', () => {
  const byTable = new Map(
    baseline.advisorSnapshot.rlsEnabledNoPolicy.map((item) => [item.table, item]),
  );

  assert.equal(byTable.size, 3);
  assert.equal(byTable.has('notification_deliveries'), false);
  assert.equal(byTable.get('guardian_verification_reviews').classification, 'service_role_only');
  assert.equal(byTable.get('app_config').classification, 'service_role_only_after_grant_hardening');
  assert.equal(byTable.get('app_private_config').classification, 'service_role_only_after_grant_hardening');

  for (const item of byTable.values()) {
    assert.equal(item.rlsEnabled, true);
    assert.equal(item.policyCount, 0);
    assert.equal(item.anonHasTablePrivileges, false);
    assert.equal(item.authenticatedHasTablePrivileges, false);
    assert.equal(item.serviceRoleHasTablePrivileges, true);
  }
});

test('live config grant hardening preserves rows and removes all client grants', () => {
  const hardening = baseline.phase1ConfigGrantHardening;
  assert.equal(hardening.migrationVersion, '20260713011803');
  assert.equal(
    hardening.repositoryMigrationPath,
    'supabase/migrations/20260713011803_harden_config_table_grants.sql',
  );
  assert.equal(hardening.applied, true);
  assert.equal(hardening.verified, true);
  assert.equal(hardening.tables.length, 2);

  for (const table of hardening.tables) {
    assert.equal(table.rlsEnabled, true);
    assert.equal(table.policyCount, 0);
    assert.equal(table.clientGrantCount, 0);
    assert.equal(table.serviceRoleGrantCount, 7);
    assert.equal(table.rowCountBefore, 2);
    assert.equal(table.rowCountAfter, 2);
  }
});

test('founder and guardian hardening records exact live migration parity and 23 passed checks', () => {
  const hardening = baseline.phase1FounderGuardianHardening;
  assert.equal(hardening.applied, true);
  assert.equal(hardening.verified, true);
  assert.equal(hardening.repositoryAndLiveMigrationParity, true);
  assert.deepEqual(
    hardening.migrations.map((item) => `${item.version}_${item.name}`),
    [
      '20260713024231_harden_founder_helper_anonymous_guard',
      '20260713024245_harden_audit_control_room_policies',
      '20260713024253_remove_anon_audit_control_room_grants',
    ],
  );
  assert.equal(hardening.founderHelper.anonymousAuthenticatedDenied, true);
  assert.equal(hardening.founderHelper.anonExecute, false);
  assert.equal(hardening.founderHelper.authenticatedExecute, true);
  assert.equal(hardening.founderHelper.serviceRoleExecute, true);
  assert.equal(hardening.anonTablePrivilegesRemoved, true);
  assert.equal(hardening.policyRole, 'authenticated');
  assert.equal(hardening.transactionOutcome, 'rolled_back');
  assert.equal(hardening.passedChecks, 23);
  assert.equal(hardening.failedChecks, 0);
});

test('notification ledger hardening records least-privilege live proof and advisor clearance', () => {
  const hardening = baseline.phase1NotificationLedgerHardening;
  assert.equal(hardening.migrationVersion, '20260713052603');
  assert.equal(hardening.migrationName, 'harden_notification_delivery_ledger');
  assert.equal(
    hardening.repositoryMigrationPath,
    'supabase/migrations/20260713052603_harden_notification_delivery_ledger.sql',
  );
  assert.equal(hardening.applied, true);
  assert.equal(hardening.verified, true);
  assert.equal(hardening.repositoryAndLiveMigrationParity, true);
  assert.equal(hardening.rlsEnabled, true);
  assert.equal(hardening.policyCount, 1);
  assert.equal(hardening.denyPolicy, 'notification_deliveries_deny_clients');
  assert.equal(hardening.anonHasTablePrivileges, false);
  assert.equal(hardening.authenticatedHasTablePrivileges, false);
  assert.deepEqual(hardening.serviceRoleTablePrivileges, ['INSERT', 'SELECT']);
  assert.deepEqual(hardening.serviceRoleSequencePrivileges, ['USAGE']);
  assert.equal(hardening.serviceRoleUpdateAllowed, false);
  assert.equal(hardening.serviceRoleDeleteAllowed, false);
  assert.deepEqual(hardening.deployedOperations, ['SELECT', 'INSERT']);
  assert.equal(hardening.advisorNoPolicyFindingCleared, true);
  assert.equal(hardening.serviceRoleInsertProof, 'passed');
  assert.equal(hardening.syntheticUsersRetained, 0);
  assert.equal(hardening.notificationRowsRetained, 0);
});

test('repository migration history matches the restored live points and notification chain', () => {
  const parity = baseline.migrationParity;
  assert.equal(parity.verified, true);
  assert.deepEqual(
    parity.restoredRepositoryMigrations.map((item) => `${item.version}_${item.name}`),
    [
      '20260704014518_create_bip_event_points_function',
      '20260713052511_restore_bip_events_points_trigger',
      '20260713052603_harden_notification_delivery_ledger',
    ],
  );

  for (const item of parity.restoredRepositoryMigrations) {
    assert.equal(fs.existsSync(path.join(root, item.repositoryPath)), true);
  }

  assert.deepEqual(parity.pointsTrigger, {
    table: 'bip_events',
    trigger: 'bip_events_award_points',
    function: 'handle_bip_event_points',
    idempotencyKey: 'point_transactions(user_id, source_type, source_id)',
  });
});

test('SECURITY DEFINER inventory has no anonymous executable functions', () => {
  assert.equal(baseline.securityDefiner.totalReviewed, 35);
  assert.deepEqual(baseline.securityDefiner.anonExecutable, []);
  assert.equal(
    baseline.securityDefiner.authenticatedExecutableCount
      + baseline.securityDefiner.serviceRoleOnlyOrTriggerInternalCount,
    baseline.securityDefiner.totalReviewed,
  );
  assert.equal(
    baseline.securityDefiner.commonControlsObserved.some((value) => /search path/.test(value)),
    true,
  );
  assert.equal(
    baseline.securityDefiner.commonControlsObserved.some((value) => /founder and guardian/i.test(value)),
    true,
  );
});

test('only two intentional custom-auth Edge Functions keep platform JWT verification disabled', () => {
  const functions = baseline.edgeFunctions.verifyJwtFalse;
  assert.equal(functions.length, 2);
  assert.deepEqual(
    functions.map((item) => item.slug).sort(),
    ['account-delete', 'safety-scan'],
  );

  for (const item of functions) {
    assert.equal(typeof item.classification, 'string');
    assert.equal(item.classification.length > 0, true);
    assert.equal(typeof item.control, 'string');
    assert.equal(item.control.length > 0, true);
  }
});

test('obsolete release and probe functions are live JWT-protected 410 retirements', () => {
  const retirements = baseline.edgeFunctions.jwtProtectedRetirements;
  assert.deepEqual(
    retirements.map((item) => item.slug).sort(),
    ['bridge-e2e-probe', 'github-workflow-status', 'release-health'],
  );

  const expectedVersions = new Map([
    ['release-health', 2],
    ['bridge-e2e-probe', 3],
    ['github-workflow-status', 4],
  ]);

  for (const item of retirements) {
    assert.equal(item.version, expectedVersions.get(item.slug));
    assert.equal(item.status, 'ACTIVE');
    assert.equal(item.verifyJwt, true);
    assert.equal(item.expectedAuthenticatedStatus, 410);
    assert.equal(item.sourceVerified, true);
    assert.match(item.sha256, /^[a-f0-9]{64}$/);
    assert.equal(typeof item.replacement, 'string');
    assert.equal(item.replacement.length > 0, true);
  }
});

test('live proof records rollback-contained suites with zero retained probe data', () => {
  assert.equal(baseline.liveProof.phase0.transactionOutcome, 'rolled_back');
  assert.equal(baseline.liveProof.phase0.passedChecks, 4);
  assert.equal(baseline.liveProof.phase0.failedChecks, 0);
  assert.deepEqual(baseline.liveProof.phase0.cleanup, {
    phase0Users: 0,
    phase0Journals: 0,
    phase0Moods: 0,
    phase0VoiceNotes: 0,
  });

  assert.equal(baseline.liveProof.founderGuardianPhase1.transactionOutcome, 'rolled_back');
  assert.equal(baseline.liveProof.founderGuardianPhase1.passedChecks, 23);
  assert.equal(baseline.liveProof.founderGuardianPhase1.failedChecks, 0);
  assert.equal(baseline.liveProof.founderGuardianPhase1.syntheticDataRetained, false);

  assert.equal(baseline.liveProof.notificationLedgerPhase1.transactionOutcome, 'rolled_back');
  assert.equal(baseline.liveProof.notificationLedgerPhase1.passedChecks, 8);
  assert.equal(baseline.liveProof.notificationLedgerPhase1.failedChecks, 0);
  assert.equal(baseline.liveProof.notificationLedgerPhase1.serviceRoleInsertProof, true);
  assert.equal(baseline.liveProof.notificationLedgerPhase1.syntheticUsersRetained, 0);
  assert.equal(baseline.liveProof.notificationLedgerPhase1.notificationRowsRetained, 0);
});

test('SQL probes are rollback-contained and exercise their declared boundaries', () => {
  assert.match(probe, /^-- Se'kret Bip Supabase authorization Phase 0 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /authenticated_denied_cross_user_reads/);
  assert.match(probe, /anon_denied_private_rows/);

  assert.match(founderProbe, /^-- Se'kret Bip founder\/guardian authorization Phase 1 proof harness/m);
  assert.match(founderProbe, /\bbegin;/i);
  assert.match(founderProbe, /\brollback;\s*$/i);
  assert.doesNotMatch(founderProbe, /\bcommit;/i);
  assert.match(founderProbe, /anonymous_founder_rejected_by_founder_helper/);
  assert.match(founderProbe, /normal_guardian_review_denied/);
  assert.match(founderProbe, /founder_control_room_upsert_succeeds/);
});

test('authorization documentation refuses blanket certification and records live founder proof', () => {
  assert.match(doc, /does not certify every table/i);
  assert.match(doc, /23 of 23 checks/i);
  assert.match(doc, /anonymous-authenticated sessions are rejected/i);
  assert.match(doc, /Begin L4 schema design only after/i);
  assert.match(doc, /JWT-protected retirement/i);
  assert.match(doc, /Direct HTTP probing was not performed/i);
});

test('baseline contains no secret values or real email addresses', () => {
  const raw = fs.readFileSync(baselinePath, 'utf8');
  assert.doesNotMatch(raw, /service[_-]?role[_-]?key\s*[:=]/i);
  assert.doesNotMatch(raw, /openai[_-]?api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(raw, /sk-[a-z0-9_-]{10,}/i);
  assert.doesNotMatch(raw, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});
