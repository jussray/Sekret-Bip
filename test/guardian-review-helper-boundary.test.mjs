import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260713073608_restrict_guardian_review_helper_execute.sql',
);
const staleMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260713060000_restrict_guardian_review_helper_execute.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_guardian_helper_execute_phase1.sql',
);
const panelPath = path.join(
  root,
  'src',
  'features',
  'control-room',
  'GuardianReviewsPanel.tsx',
);
const evidencePath = path.join(
  root,
  'security',
  'guardian-helper-execution-hardening.json',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

test('guardian authorization helper is no longer a direct authenticated RPC', () => {
  assert.match(
    migration,
    /revoke all on function public\.can_manage_guardian_reviews\(\)\s+from public, anon, authenticated;/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.can_manage_guardian_reviews\(\)\s+to service_role;/i,
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.can_manage_guardian_reviews\(\)[^;]*authenticated/i,
  );
});

test('repository migration filename matches the live Supabase version', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.equal(fs.existsSync(staleMigrationPath), false);
  assert.equal(evidence.migration.version, '20260713073608');
  assert.equal(evidence.migration.name, 'restrict_guardian_review_helper_execute');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713073608_restrict_guardian_review_helper_execute.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.verified, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
});

test('founder UI uses reviewed queue and decision wrappers, not the internal helper', () => {
  assert.match(panel, /rpc\('list_guardian_verification_queue'\)/);
  assert.match(panel, /rpc\('review_guardian_verification'/);
  assert.doesNotMatch(panel, /rpc\('can_manage_guardian_reviews'\)/);
  assert.equal(evidence.boundary.mobileClientDirectCallSites, 0);
});

test('guardian helper proof is rollback-contained and retains no user or app rows', () => {
  assert.match(probe, /^-- Se'kret Bip guardian helper execution Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.doesNotMatch(probe, /insert\s+into\s+auth\.users/i);
  assert.doesNotMatch(probe, /insert\s+into\s+public\./i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);

  assert.equal(evidence.liveProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.liveProof.passedChecks, 7);
  assert.equal(evidence.liveProof.failedChecks, 0);
  assert.equal(evidence.liveProof.syntheticUsersCreated, 0);
  assert.equal(evidence.liveProof.applicationRowsWritten, 0);
  assert.equal(evidence.liveProof.productionDataRetained, false);
});

test('guardian helper proof covers direct denial and wrapper continuity', () => {
  for (const check of [
    'normal_direct_helper_denied',
    'normal_queue_rpc_denied',
    'normal_review_rpc_denied',
    'founder_direct_helper_denied',
    'founder_queue_rpc_allowed',
    'founder_review_reaches_target_validation',
    'guardian_helper_grants_are_least_privilege',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /exception when insufficient_privilege/i);
  assert.match(probe, /exception when invalid_parameter_value/i);
  assert.match(
    probe,
    /has_function_privilege\('service_role', 'public\.can_manage_guardian_reviews\(\)', 'EXECUTE'\)/i,
  );

  assert.equal(evidence.boundary.anonExecute, false);
  assert.equal(evidence.boundary.authenticatedExecute, false);
  assert.equal(evidence.boundary.serviceRoleExecute, true);
  assert.equal(evidence.wrapperContinuity.normalQueueDenied, true);
  assert.equal(evidence.wrapperContinuity.normalReviewDenied, true);
  assert.equal(evidence.wrapperContinuity.founderQueueAllowed, true);
  assert.equal(evidence.wrapperContinuity.founderReviewReachedTargetValidation, true);
  assert.equal(evidence.advisor.authenticatedSecurityDefinerFindingCleared, true);
});

test('migration documents why the helper remains executable internally', () => {
  assert.match(migration, /internal authorization predicate/i);
  assert.match(migration, /postgres-owned SECURITY DEFINER context/i);
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);

  assert.equal(evidence.boundary.classification, 'internal_authorization_predicate');
  assert.equal(evidence.boundary.postgresOwnerSupportsInternalCalls, true);
  assert.equal(evidence.wrapperContinuity.parentLinkConsentChanged, false);
  assert.equal(evidence.wrapperContinuity.teenDataAccessChanged, false);
});

test('guardian helper evidence contains no secrets or personal addresses', () => {
  const raw = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(raw, /service[_-]?role[_-]?key\s*[:=]/i);
  assert.doesNotMatch(raw, /sk-[a-z0-9_-]{10,}/i);
  assert.doesNotMatch(raw, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});
