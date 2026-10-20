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
  '20260713154809_harden_parent_link_rpc_behavior.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_parent_link_rpc_phase1.sql',
);
const evidencePath = path.join(
  root,
  'security',
  'parent-link-rpc-hardening.json',
);
const clientPath = path.join(root, 'src', 'utils', 'parentLink.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const client = fs.readFileSync(clientPath, 'utf8');

test('repository records the exact live parent-link migration', () => {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(evidence.migration.version, '20260713154809');
  assert.equal(evidence.migration.name, 'harden_parent_link_rpc_behavior');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713154809_harden_parent_link_rpc_behavior.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
  assert.equal(fs.existsSync(migrationPath), true);
});

test('teen invite creation requires a completed permanent teen profile', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(migration, /v_profile\.account_side <> 'teen'/i);
  assert.match(migration, /v_profile\.onboarding_complete is not true/i);
  assert.match(migration, /v_state in \('SUSPENDED', 'MANUAL_REVIEW'\)/i);
  assert.match(migration, /completed teen profile required/i);
});

test('invite regeneration reuses the canonical one-row-per-teen relationship', () => {
  assert.match(
    migration,
    /select \* into v_link[\s\S]*from public\.parent_links[\s\S]*where teen_user_id = v_user_id[\s\S]*for update/i,
  );
  assert.match(migration, /v_has_link := found/i);
  assert.match(migration, /active parent link must be revoked first/i);
  assert.match(
    migration,
    /if v_has_link then[\s\S]*update public\.parent_links[\s\S]*parent_user_id = null[\s\S]*status = 'pending'[\s\S]*invite_code = v_code/i,
  );
  assert.match(
    migration,
    /else[\s\S]*insert into public\.parent_links[\s\S]*v_user_id[\s\S]*'pending'/i,
  );
  assert.match(migration, /interval '48 hours'/i);
});

test('expired redemption commits expiration instead of raising it away', () => {
  const expiredBranch = migration.match(
    /if v_link\.expires_at is null[\s\S]*?end if;/i,
  )?.[0] ?? '';

  assert.match(expiredBranch, /status = 'expired'/i);
  assert.match(expiredBranch, /is_active = false/i);
  assert.match(expiredBranch, /invite_code = null/i);
  assert.match(expiredBranch, /verification_state = 'EXPIRED'/i);
  assert.match(expiredBranch, /parent_link_state = 'expired'/i);
  assert.match(expiredBranch, /return;/i);
  assert.doesNotMatch(expiredBranch, /raise exception/i);
  assert.doesNotMatch(migration, /raise exception 'invite_expired'/i);
});

test('valid redemption remains locked, one-time, self-link safe, and teen scoped', () => {
  assert.match(migration, /where invite_code = upper\(trim\(p_invite_code\)\)[\s\S]*for update/i);
  assert.match(migration, /v_link\.status <> 'pending'/i);
  assert.match(migration, /v_link\.is_active is not true/i);
  assert.match(migration, /v_link\.teen_user_id = v_parent_id/i);
  assert.match(migration, /parent_user_id = v_parent_id/i);
  assert.match(migration, /invite_code = null/i);
  assert.match(migration, /verification_state = 'VERIFIED_TEEN'/i);
  assert.match(migration, /where user_id = v_link\.teen_user_id/i);
});

test('parent-link RPC grants are explicit and anonymous execution stays denied', () => {
  for (const signature of [
    'public\\.create_parent_link_invite\\(\\)',
    'public\\.redeem_parent_link_invite\\(text\\)',
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

  assert.equal(
    [...migration.matchAll(/set search_path = public, auth/gi)].length,
    2,
  );
});

test('relationship consent remains independent from guardian identity review', () => {
  assert.doesNotMatch(migration, /VERIFIED_GUARDIAN/);
  assert.doesNotMatch(migration, /PENDING_GUARDIAN_REVIEW/);
  assert.doesNotMatch(migration, /guardian_verification_reviews/);
  assert.match(migration, /Guardian identity review remains independent/i);
  assert.equal(evidence.scope.guardianIdentityContractChanged, false);
  assert.equal(evidence.scope.bridgeVisibilityChanged, false);
});

test('parent-link proof is rollback-contained and contains no real identities', () => {
  assert.match(probe, /^-- Se'kret Bip authenticated parent-link RPC Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('parent-link proof covers all high-blast behavior outcomes', () => {
  for (const check of [
    'teen_invite_regenerates_in_place',
    'parent_profile_denied',
    'profileless_denied',
    'anonymous_teen_denied',
    'suspended_teen_denied',
    'active_link_replacement_denied',
    'expired_invite_commits_expiration',
    'self_link_denied',
    'valid_redemption_is_one_time_and_self_scoped',
    'used_invite_denied',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /exception when insufficient_privilege/gi);
  assert.match(probe, /exception when others/gi);
  assert.match(
    probe,
    /select count\(\*\)::text[\s\S]*?from public\.redeem_parent_link_invite/i,
  );
});

test('live proof records ten passes and zero retained synthetic data', () => {
  assert.equal(evidence.preDeployDefects.transactionOutcome, 'rolled_back');
  assert.equal(evidence.preDeployDefects.parentProfileCouldCreateTeenInvite, true);
  assert.equal(evidence.preDeployDefects.profilelessPermanentAccountCouldCreateTeenInvite, true);
  assert.equal(evidence.preDeployDefects.inviteRegenerationConflictedWithCanonicalTeenRow, true);
  assert.equal(evidence.preDeployDefects.expiredRedemptionRolledBackItsOwnExpiration, true);

  assert.equal(evidence.postDeployProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.postDeployProof.passedChecks, 10);
  assert.equal(evidence.postDeployProof.failedChecks, 0);
  assert.equal(evidence.postDeployProof.retainedSyntheticUsers, 0);
  assert.equal(evidence.postDeployProof.retainedParentLinks, 0);
  assert.equal(evidence.postDeployProof.retainedVerificationRows, 0);
});

test('advisor warning is classified as an intentional proved client API', () => {
  assert.equal(
    evidence.advisorClassification.createParentLinkInvite,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(
    evidence.advisorClassification.redeemParentLinkInvite,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(evidence.advisorClassification.warningExpectedToRemain, true);
  assert.equal(evidence.releaseGate.authenticatedFunctionBlockerComplete, false);
});

test('client treats empty redemption as expired and validates the complete active relationship', () => {
  assert.match(client, /Array\.isArray\(data\) && data\.length === 0/);
  assert.match(client, /code: 'expired_or_used'/);
  assert.match(client, /validateRedeemedParentLink\(data, userId\)/);
  assert.match(client, /row\.parent_user_id !== expectedParentId/);
  assert.match(client, /row\.status !== 'active'/);
  assert.match(client, /code: 'invalid_response'/);
});

test('migration is transactional and explains both repaired defects', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /one row per[\s\S]*teen/i);
  assert.match(migration, /expired link and teen verification state to commit/i);
});
