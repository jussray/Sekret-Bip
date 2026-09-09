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
  '20260713155855_preserve_safety_state_on_parent_link_revoke.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_parent_link_revoke_phase1.sql',
);
const evidencePath = path.join(
  root,
  'security',
  'parent-link-revoke-hardening.json',
);
const clientPath = path.join(root, 'src', 'utils', 'parentLink.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const client = fs.readFileSync(clientPath, 'utf8');
const revokeClient = client.match(
  /export async function revokeParentLink\(\): Promise<boolean> \{[\s\S]*?^\}/m,
)?.[0] ?? '';

test('repository records the exact live parent-link revoke migration', () => {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(evidence.migration.version, '20260713155855');
  assert.equal(evidence.migration.name, 'preserve_safety_state_on_parent_link_revoke');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713155855_preserve_safety_state_on_parent_link_revoke.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
  assert.equal(fs.existsSync(migrationPath), true);
});

test('parent-link revoke remains permanent-session and relationship scoped', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(migration, /status in \('pending', 'active'\)/i);
  assert.match(migration, /teen_user_id = v_user_id or parent_user_id = v_user_id/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /if not found then[\s\S]*return false;/i);
});

test('relationship row is fully revoked without deleting historical ownership', () => {
  assert.match(migration, /status = 'revoked'/i);
  assert.match(migration, /is_active = false/i);
  assert.match(migration, /invite_code = null/i);
  assert.match(migration, /expires_at = null/i);
  assert.match(migration, /where id = v_link\.id/i);
  assert.doesNotMatch(migration, /delete from public\.parent_links/i);
  assert.equal(evidence.controls.relationshipHistoryRetained, true);
});

test('suspended and manual-review verification states and reasons are preserved', () => {
  assert.match(
    migration,
    /verification_state = case[\s\S]*verification_state in \('SUSPENDED', 'MANUAL_REVIEW'\)[\s\S]*then verification_state[\s\S]*else 'PENDING_PARENT'/i,
  );
  assert.match(
    migration,
    /verification_reason = case[\s\S]*verification_state in \('SUSPENDED', 'MANUAL_REVIEW'\)[\s\S]*then verification_reason[\s\S]*else 'parent_link_revoked'/i,
  );
  assert.match(migration, /parent_link_state = 'revoked'/i);
  assert.match(migration, /where user_id = v_link\.teen_user_id/i);
  assert.equal(evidence.controls.suspendedStatePreserved, true);
  assert.equal(evidence.controls.manualReviewStatePreserved, true);
  assert.equal(evidence.controls.protectedVerificationReasonPreserved, true);
});

test('revoke RPC grants are explicit and anonymous execution stays denied', () => {
  assert.match(
    migration,
    /revoke all on function public\.revoke_parent_link\(uuid\)\s+from public, anon;/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.revoke_parent_link\(uuid\)\s+to authenticated, service_role;/i,
  );
  assert.match(migration, /set search_path = public, auth/i);
});

test('revoke proof is rollback-contained and contains no real identities', () => {
  assert.match(probe, /^-- Se'kret Bip authenticated parent-link revoke Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('revoke proof covers ownership, retry, and protected-state outcomes', () => {
  for (const check of [
    'teen_can_revoke_own_active_link',
    'normal_revoke_updates_link_and_verification',
    'linked_parent_can_revoke_active_link',
    'unrelated_user_denied_without_mutation',
    'anonymous_session_denied',
    'suspended_link_revoke_returns_true',
    'suspended_state_and_reason_preserved_after_revoke',
    'manual_review_pending_revoke_returns_true',
    'manual_review_state_and_reason_preserved_after_revoke',
    'repeated_revoke_is_safe_noop',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /exception when insufficient_privilege/i);
  assert.match(probe, /verification_reason = 'safety_hold'/i);
  assert.match(probe, /verification_reason = 'manual_case'/i);
});

test('live proof records ten passes and zero retained synthetic data', () => {
  assert.equal(evidence.preDeployDefect.transactionOutcome, 'rolled_back');
  assert.equal(evidence.preDeployDefect.suspendedStateWasOverwritten, true);
  assert.equal(evidence.preDeployDefect.manualReviewStateWasOverwritten, true);
  assert.equal(evidence.preDeployDefect.protectedReasonWasOverwritten, true);

  assert.equal(evidence.postDeployProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.postDeployProof.proofParts.length, 2);
  assert.equal(evidence.postDeployProof.passedChecks, 10);
  assert.equal(evidence.postDeployProof.failedChecks, 0);
  assert.equal(evidence.postDeployProof.retainedSyntheticUsers, 0);
  assert.equal(evidence.postDeployProof.retainedParentLinks, 0);
  assert.equal(evidence.postDeployProof.retainedVerificationRows, 0);
});

test('advisor warning is classified as an intentional proved client API', () => {
  assert.equal(
    evidence.advisorClassification.classification,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(evidence.advisorClassification.warningExpectedToRemain, true);
  assert.equal(evidence.releaseGate.authenticatedFunctionBlockerComplete, false);
});

test('existing client uses the guarded RPC and treats no active link as false', () => {
  assert.match(revokeClient, /export async function revokeParentLink\(\): Promise<boolean>/);
  assert.match(revokeClient, /rpc\('revoke_parent_link'\)/);
  assert.match(revokeClient, /return data === true;/);
  assert.doesNotMatch(revokeClient, /\.from\('parent_links'\)/i);
  assert.doesNotMatch(revokeClient, /\.delete\(\)/i);
});

test('migration is transactional and documents consent versus safety state', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /Revocation removes relationship consent/i);
  assert.match(migration, /must not erase a safety or[\s\S]*manual-review decision/i);
  assert.equal(evidence.scope.bridgeVisibilityChanged, false);
  assert.equal(evidence.scope.guardianIdentityChanged, false);
});
