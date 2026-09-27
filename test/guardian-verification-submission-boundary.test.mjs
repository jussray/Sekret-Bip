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
  '20260713074443_harden_guardian_verification_submission.sql',
);
const staleMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260713080000_harden_guardian_verification_submission.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_guardian_submission_phase1.sql',
);
const clientPath = path.join(
  root,
  'src',
  'features',
  'identity',
  'accountProfile.ts',
);
const evidencePath = path.join(
  root,
  'security',
  'guardian-submission-hardening.json',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const client = fs.readFileSync(clientPath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

test('repository migration matches the exact live Supabase version', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.equal(fs.existsSync(staleMigrationPath), false);
  assert.equal(evidence.migration.version, '20260713074443');
  assert.equal(evidence.migration.name, 'harden_guardian_verification_submission');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713074443_harden_guardian_verification_submission.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.verified, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
});

test('guardian submission requires the same guardian Circle identity used by the review queue', () => {
  assert.match(
    migration,
    /select account_type into v_circle_account_type[\s\S]*from public\.circle_profiles[\s\S]*where user_id = v_user_id/i,
  );
  assert.match(
    migration,
    /if not found or v_circle_account_type <> 'guardian' then[\s\S]*guardian circle profile required/i,
  );
  assert.match(migration, /using errcode = '42501'/i);
  assert.equal(evidence.boundary.requiresGuardianCircleIdentity, true);
});

test('submission remains self-scoped, permanent-account-only, and state-aware', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /is_anonymous/i);
  assert.match(migration, /v_profile\.account_side <> 'parent'/i);
  assert.match(migration, /v_profile\.onboarding_complete is not true/i);
  assert.match(migration, /v_state = 'VERIFIED_GUARDIAN'/i);
  assert.match(migration, /v_state = 'GUARDIAN_SUSPENDED'/i);
  assert.match(migration, /where user_id = v_user_id/i);
  assert.doesNotMatch(migration, /parent_links/i);

  assert.equal(evidence.boundary.requiresPermanentSession, true);
  assert.equal(evidence.boundary.requiresCompletedParentProfile, true);
  assert.equal(evidence.boundary.deniesSuspendedGuardian, true);
  assert.equal(evidence.boundary.verifiedGuardianIdempotent, true);
  assert.equal(evidence.boundary.createsParentLink, false);
  assert.equal(evidence.boundary.readsTeenData, false);
});

test('authenticated client keeps only the intentional submission wrapper', () => {
  assert.match(
    migration,
    /revoke all on function public\.submit_guardian_verification\(\)\s+from public, anon;/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_guardian_verification\(\)\s+to authenticated;/i,
  );
  assert.match(client, /rpc\('submit_guardian_verification'\)/);
  assert.equal(evidence.boundary.anonExecute, false);
  assert.equal(evidence.boundary.authenticatedExecute, true);
});

test('guardian submission proof is rollback-contained and uses synthetic fixtures only', () => {
  assert.match(probe, /^-- Se'kret Bip guardian submission authorization Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);

  assert.equal(evidence.preDeployProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.preDeployProof.passedChecks, 9);
  assert.equal(evidence.preDeployProof.failedChecks, 0);
  assert.equal(evidence.preDeployProof.syntheticUsersRetained, 0);
  assert.equal(evidence.preDeployProof.applicationRowsRetained, 0);
  assert.equal(evidence.postDeployProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.postDeployProof.syntheticUsersRetained, 0);
});

test('guardian submission proof covers every trust-boundary outcome', () => {
  for (const check of [
    'valid_guardian_submission_succeeds',
    'missing_circle_denied',
    'teen_circle_identity_denied',
    'teen_profile_denied',
    'incomplete_parent_denied',
    'anonymous_session_denied',
    'suspended_guardian_denied',
    'verified_guardian_is_idempotent',
    'submission_is_self_scoped',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /exception when insufficient_privilege/gi);
  assert.match(probe, /PENDING_GUARDIAN_REVIEW/);
  assert.match(probe, /VERIFIED_GUARDIAN/);
  assert.match(probe, /GUARDIAN_SUSPENDED/);

  assert.equal(evidence.defectProof.completedParentWithoutCircleWasAcceptedBeforeFix, true);
  assert.equal(evidence.defectProof.resultingStateBeforeFix, 'PENDING_GUARDIAN_REVIEW');
  assert.equal(evidence.defectProof.guardianCircleRowsBeforeFix, 0);
  assert.equal(evidence.defectProof.productionDataRetained, false);
  assert.equal(evidence.postDeployProof.validGuardianAccepted, true);
  assert.equal(evidence.postDeployProof.missingGuardianIdentityDenied, true);
  assert.equal(evidence.postDeployProof.selfScopePreserved, true);
});

test('migration is transactional and documents the queue-integrity reason', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /pending records that the founder\/admin queue can never display/i);
  assert.match(migration, /never creates or uses teen parent_link consent/i);
});

test('guardian submission evidence contains no secrets or personal addresses', () => {
  const raw = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(raw, /service[_-]?role[_-]?key\s*[:=]/i);
  assert.doesNotMatch(raw, /sk-[a-z0-9_-]{10,}/i);
  assert.doesNotMatch(raw, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});
