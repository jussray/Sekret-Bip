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
  '20260713161055_harden_push_token_ownership.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_push_token_phase1.sql',
);
const evidencePath = path.join(root, 'security', 'push-token-hardening.json');
const syncPath = path.join(root, 'src', 'services', 'pushTokenSync.ts');
const sessionPath = path.join(root, 'src', 'services', 'session.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const syncClient = fs.readFileSync(syncPath, 'utf8');
const sessionClient = fs.readFileSync(sessionPath, 'utf8');

test('repository records the exact live push-token migration', () => {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(evidence.migration.version, '20260713161055');
  assert.equal(evidence.migration.name, 'harden_push_token_ownership');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713161055_harden_push_token_ownership.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
  assert.equal(fs.existsSync(migrationPath), true);
});

test('push token validation mirrors Expo wrapper and UUID token forms', () => {
  assert.match(migration, /v_token like 'ExponentPushToken\[%\]'/i);
  assert.match(migration, /v_token like 'ExpoPushToken\[%\]'/i);
  assert.match(
    migration,
    /\^\[a-z0-9\]\{8\}-\[a-z0-9\]\{4\}-\[a-z0-9\]\{4\}-\[a-z0-9\]\{4\}-\[a-z0-9\]\{12\}\$/i,
  );
  assert.match(migration, /invalid expo push token/i);
  assert.match(migration, /using errcode = '22023'/i);
  assert.deepEqual(evidence.controls.tokenFormats, [
    'ExponentPushToken[...]',
    'ExpoPushToken[...]',
    'uuid',
  ]);
});

test('completed profile side overrides caller-supplied app variant', () => {
  assert.match(
    migration,
    /select account_side into v_profile_side[\s\S]*from public\.app_profiles[\s\S]*where user_id = v_user_id[\s\S]*account_side in \('teen', 'parent'\)/i,
  );
  assert.match(
    migration,
    /v_effective_variant := coalesce\(v_profile_side, p_app_variant\)/i,
  );
  assert.match(migration, /app_variant = excluded\.app_variant/i);
  assert.equal(evidence.controls.completedProfileSideOverridesCallerMetadata, true);
});

test('atomic claim permits same-owner refresh and disabled-only account handoff', () => {
  assert.match(
    migration,
    /on conflict \(expo_push_token\) do update[\s\S]*where public\.push_tokens\.user_id = excluded\.user_id[\s\S]*or public\.push_tokens\.enabled = false/i,
  );
  assert.match(migration, /returning user_id into v_claimed_user_id/i);
  assert.match(
    migration,
    /if not found then[\s\S]*push token is already claimed by another active account/i,
  );
  assert.equal(evidence.controls.sameOwnerRefreshAllowed, true);
  assert.equal(evidence.controls.enabledCrossUserTransferDenied, true);
  assert.equal(evidence.controls.disabledCrossUserHandoffAllowed, true);
  assert.equal(evidence.controls.claimConflictRuleIsAtomic, true);
});

test('disable remains idempotent and owner scoped', () => {
  const disableBody = migration.match(
    /create or replace function public\.disable_push_token[\s\S]*?comment on function public\.disable_push_token\(text\)/i,
  )?.[0] ?? '';

  assert.match(disableBody, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(disableBody, /enabled = false/i);
  assert.match(disableBody, /expo_push_token = v_token/i);
  assert.match(disableBody, /user_id = v_user_id/i);
  assert.doesNotMatch(disableBody, /delete from public\.push_tokens/i);
  assert.equal(evidence.controls.disableIsOwnerScoped, true);
  assert.equal(evidence.controls.disableIsIdempotent, true);
});

test('push token RPC grants are explicit and anonymous execution stays denied', () => {
  for (const signature of [
    'public\\.claim_push_token\\(text, text, text\\)',
    'public\\.disable_push_token\\(text\\)',
  ]) {
    assert.match(
      migration,
      new RegExp(`revoke all on function ${signature}\\s+from public, anon;`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function ${signature}\\s+to authenticated, service_role;`, 'i'),
    );
  }

  assert.equal([...migration.matchAll(/set search_path = public, auth/gi)].length, 2);
  assert.equal(evidence.postDeployEvidence.structuralChecks.anonExecute, false);
  assert.equal(evidence.postDeployEvidence.structuralChecks.authenticatedExecute, true);
  assert.equal(evidence.postDeployEvidence.structuralChecks.serviceRoleExecute, true);
});

test('push token proof is rollback-contained and contains no real identities', () => {
  assert.match(probe, /^-- Se'kret Bip authenticated push-token Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('push token proof covers ownership, metadata, format, and handoff outcomes', () => {
  for (const check of [
    'profile_side_overrides_spoof',
    'same_owner_refreshes',
    'enabled_cross_user_transfer_denied',
    'denied_transfer_preserves_owner',
    'owner_disables',
    'disabled_token_handoff_allowed',
    'former_owner_cannot_disable',
    'current_owner_disables',
    'invalid_token_denied',
    'modern_wrapper_token_accepted',
    'uuid_token_accepted',
    'anonymous_claim_denied',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.equal(evidence.preDeployBehaviorProof.passedChecks, 12);
  assert.equal(evidence.preDeployBehaviorProof.failedChecks, 0);
  assert.equal(evidence.preDeployBehaviorProof.transactionOutcome, 'rolled_back');
});

test('post-deploy evidence records executable checks, predicates, limits, and cleanup', () => {
  assert.equal(evidence.postDeployEvidence.executableChecks.passedChecks, 4);
  assert.equal(evidence.postDeployEvidence.executableChecks.failedChecks, 0);
  assert.deepEqual(evidence.postDeployEvidence.executableChecks.checks, [
    'profile_side_overrides_spoof',
    'same_owner_refreshes',
    'enabled_transfer_denied',
    'denied_transfer_preserves_owner',
  ]);

  const { anonExecute, ...requiredStructuralChecks } =
    evidence.postDeployEvidence.structuralChecks;
  assert.equal(anonExecute, false);
  for (const value of Object.values(requiredStructuralChecks)) {
    if (typeof value === 'boolean') assert.equal(value, true);
  }
  assert.equal(evidence.postDeployEvidence.toolingLimit.encountered, true);
  assert.equal(evidence.postDeployEvidence.toolingLimit.productionMutationFromBlockedCalls, false);
  assert.equal(evidence.postDeployEvidence.retainedSyntheticUsers, 0);
  assert.equal(evidence.postDeployEvidence.retainedSyntheticPushTokens, 0);
  assert.equal(evidence.postDeployEvidence.productionPushTokenRows, 0);
});

test('client uses RPCs only and supplies device metadata for server validation', () => {
  assert.match(syncClient, /rpc\('claim_push_token'/);
  assert.match(syncClient, /p_platform: Platform\.OS/);
  assert.match(syncClient, /p_app_variant: getAppVariant\(\)/);
  assert.match(syncClient, /rpc\('disable_push_token'/);
  assert.doesNotMatch(syncClient, /\.from\('push_tokens'\)/i);
});

test('sign-out disables the current token before ending authentication', () => {
  const disableIndex = sessionClient.indexOf('await disableCurrentPushToken()');
  const signOutIndex = sessionClient.indexOf('await supabase.auth.signOut()');
  assert.notEqual(disableIndex, -1);
  assert.notEqual(signOutIndex, -1);
  assert.equal(disableIndex < signOutIndex, true);
  assert.equal(evidence.controls.clientDisablesBeforeAuthSignOut, true);
});

test('advisor warnings are classified as intentional proved client APIs', () => {
  assert.equal(
    evidence.advisorClassification.claimPushToken,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(
    evidence.advisorClassification.disablePushToken,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(evidence.advisorClassification.warningsExpectedToRemain, true);
  assert.equal(evidence.releaseGate.authenticatedFunctionBlockerComplete, false);
});

test('migration is transactional and documents the account-switch boundary', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /Cross-user handoff is allowed only after/i);
  assert.match(migration, /enabled token cannot silently migrate/i);
  assert.match(migration, /Completed account profile side overrides caller metadata/i);
});
