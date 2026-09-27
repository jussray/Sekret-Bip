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
  '20260713162809_lock_completed_account_profile_identity.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_account_profile_identity_phase1.sql',
);
const evidencePath = path.join(
  root,
  'security',
  'account-profile-identity-hardening.json',
);
const clientPath = path.join(
  root,
  'src',
  'features',
  'identity',
  'accountProfile.ts',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const client = fs.readFileSync(clientPath, 'utf8');

test('repository records the exact live account-profile identity migration', () => {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(evidence.migration.version, '20260713162809');
  assert.equal(evidence.migration.name, 'lock_completed_account_profile_identity');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713162809_lock_completed_account_profile_identity.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
  assert.equal(fs.existsSync(migrationPath), true);
});

test('profile writer remains permanent-session and self scoped', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(migration, /where user_id = v_user_id[\s\S]*for update/i);
  assert.match(migration, /insert into public\.app_profiles[\s\S]*v_user_id/i);
  assert.doesNotMatch(migration, /p_user_id/i);
  assert.equal(evidence.controls.permanentSessionRequired, true);
  assert.equal(evidence.controls.selfScopedToAuthUid, true);
});

test('completed account side is locked after the current profile row is locked', () => {
  assert.match(
    migration,
    /select \* into v_existing[\s\S]*from public\.app_profiles[\s\S]*where user_id = v_user_id[\s\S]*for update/i,
  );
  assert.match(migration, /v_has_existing := found/i);
  assert.match(
    migration,
    /v_existing\.onboarding_complete is true[\s\S]*v_existing\.account_side is distinct from p_account_side/i,
  );
  assert.match(migration, /completed account side cannot change/i);
  assert.equal(evidence.controls.currentProfileRowLockedBeforeTransition, true);
  assert.equal(evidence.controls.completedSideImmutable, true);
});

test('profile completion is monotonic while incomplete onboarding may still pivot', () => {
  assert.match(
    migration,
    /v_requested_complete boolean := coalesce\(p_onboarding_complete, false\)/i,
  );
  assert.match(
    migration,
    /v_existing\.onboarding_complete is true[\s\S]*v_requested_complete is not true/i,
  );
  assert.match(migration, /completed profile cannot return to onboarding/i);
  assert.doesNotMatch(
    migration,
    /v_existing\.onboarding_complete is not true[\s\S]*account_side cannot change/i,
  );
  assert.equal(evidence.controls.preCompletionSidePivotAllowed, true);
  assert.equal(evidence.controls.completionMonotonic, true);
  assert.equal(evidence.controls.sameSideCompletedEditsAllowed, true);
});

test('nullable identity values are explicitly rejected before enum validation', () => {
  assert.match(
    migration,
    /p_account_side is null[\s\S]*p_account_side not in \('teen', 'parent'\)/i,
  );
  for (const field of [
    'p_age_range',
    'p_gender',
    'p_selected_companion',
    'p_parent_room_style',
    'p_parent_focus',
  ]) {
    assert.match(migration, new RegExp(`${field} is null`, 'i'));
  }
  assert.match(migration, /SQL NOT IN returns NULL for NULL/i);
  assert.equal(evidence.controls.nullAccountSideRejected, true);
  assert.equal(evidence.controls.nullTeenAgeRejectedForCompletion, true);
  assert.equal(evidence.controls.nullTeenGenderRejectedForCompletion, true);
  assert.equal(evidence.controls.nullTeenCompanionRejectedForCompletion, true);
  assert.equal(evidence.controls.nullParentRoomStyleRejectedForCompletion, true);
  assert.equal(evidence.controls.nullParentFocusRejectedForCompletion, true);
});

test('completed side-specific fields remain validated', () => {
  assert.match(migration, /v_requested_complete and p_account_side = 'teen'/i);
  assert.match(migration, /p_age_range not in \('13-15', '16-17', '18-19'\)/i);
  assert.match(migration, /p_gender not in \('girl', 'boy', 'other'\)/i);
  assert.match(migration, /p_selected_companion not in \('raylene', 'rylane', 'cloud', 'night'\)/i);
  assert.match(migration, /v_requested_complete and p_account_side = 'parent'/i);
  assert.match(migration, /p_parent_room_style not in \('mom', 'dad'\)/i);
  assert.match(migration, /p_parent_focus not in \('support', 'listen', 'repair', 'learn'\)/i);
});

test('role and capability columns remain outside the RPC write set', () => {
  const insertAndUpdate = migration.match(
    /insert into public\.app_profiles[\s\S]*?returning \* into v_profile;/i,
  )?.[0] ?? '';

  assert.doesNotMatch(insertAndUpdate, /\brole\b/i);
  assert.doesNotMatch(insertAndUpdate, /can_view_audits/i);
  assert.doesNotMatch(insertAndUpdate, /can_manage_app/i);
  assert.doesNotMatch(insertAndUpdate, /exclude_from_analytics/i);
  assert.equal(evidence.controls.roleOutsideWriteSet, true);
  assert.equal(evidence.controls.auditCapabilityOutsideWriteSet, true);
  assert.equal(evidence.controls.managementCapabilityOutsideWriteSet, true);
  assert.equal(evidence.controls.analyticsCapabilityOutsideWriteSet, true);
});

test('profile RPC grants are explicit and anonymous execution stays denied', () => {
  const signature = 'public\\.upsert_own_bip_profile\\([\\s\\S]*?text[\\s\\S]*?\\)';
  assert.match(
    migration,
    new RegExp(`revoke all on function ${signature} from public, anon;`, 'i'),
  );
  assert.match(
    migration,
    new RegExp(`grant execute on function ${signature} to authenticated, service_role;`, 'i'),
  );
  assert.match(migration, /set search_path = public, auth/i);
  assert.equal(evidence.postDeployEvidence.structuralChecks.anonExecute, false);
  assert.equal(evidence.postDeployEvidence.structuralChecks.authenticatedExecute, true);
  assert.equal(evidence.postDeployEvidence.structuralChecks.serviceRoleExecute, true);
});

test('identity proof is rollback-contained and contains no real identities', () => {
  assert.match(probe, /^-- Se'kret Bip authenticated account-profile identity Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('identity proof covers flexible onboarding and durable completion outcomes', () => {
  for (const check of [
    'precompletion_side_pivot_allowed',
    'profile_completion_succeeds',
    'same_side_completed_update_allowed',
    'completed_side_flip_denied',
    'completed_downgrade_denied',
    'invalid_completed_parent_denied',
    'denied_transitions_leave_profile_intact',
    'anonymous_session_denied',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /exception when invalid_parameter_value/gi);
  assert.match(probe, /exception when insufficient_privilege/i);
});

test('live evidence records defects, six postdeploy checks, and zero retained fixtures', () => {
  assert.equal(evidence.preDeployDefects.transactionOutcome, 'rolled_back');
  assert.equal(evidence.preDeployDefects.completedTeenCouldFlipToParent.executed, true);
  assert.equal(evidence.preDeployDefects.completedTeenCouldFlipToParent.confirmed, true);
  assert.equal(evidence.preDeployDefects.completedProfileCouldReturnToOnboardingAndClearFields.confirmed, true);
  assert.equal(evidence.preDeployDefects.nullableRequiredParentFieldBypassedValidation.confirmed, true);
  assert.equal(evidence.preDeployDefects.nullableAccountSideBypassRisk.executed, false);
  assert.equal(evidence.preDeployDefects.nullableAccountSideBypassRisk.structurallyConfirmed, true);

  assert.equal(evidence.postDeployEvidence.executableChecks.passedChecks, 6);
  assert.equal(evidence.postDeployEvidence.executableChecks.failedChecks, 0);
  assert.deepEqual(evidence.postDeployEvidence.executableChecks.checks, [
    'precompletion_pivot_completion_and_same_side_update',
    'completed_side_flip_denied_and_intact',
    'completed_downgrade_denied_and_intact',
    'null_required_field_denied_without_mutation',
    'null_account_side_denied_without_mutation',
    'anonymous_session_denied_without_mutation',
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
  assert.equal(evidence.postDeployEvidence.retainedSyntheticProfiles, 0);
  assert.equal(evidence.postDeployEvidence.productionProfiles, 1);
  assert.equal(evidence.postDeployEvidence.productionCompletedProfiles, 0);
});

test('production inventory required no identity backfill', () => {
  assert.equal(evidence.productionInventory.totalProfilesBefore, 1);
  assert.equal(evidence.productionInventory.completedProfilesBefore, 0);
  assert.equal(evidence.productionInventory.completedWithoutSideBefore, 0);
  assert.equal(evidence.productionInventory.malformedCompletedTeensBefore, 0);
  assert.equal(evidence.productionInventory.malformedCompletedParentsBefore, 0);
  assert.equal(evidence.productionInventory.totalProfilesAfter, 1);
  assert.equal(evidence.productionInventory.completedProfilesAfter, 0);
  assert.equal(evidence.productionInventory.backfillRequired, false);
});

test('client sends only the authenticated user profile fields through the RPC', () => {
  const saveFunction = client.match(
    /export async function saveAccountProfile[\s\S]*?^\}/m,
  )?.[0] ?? '';

  assert.match(saveFunction, /rpc\('upsert_own_bip_profile'/);
  assert.match(saveFunction, /p_account_side: input\.accountSide/);
  assert.match(saveFunction, /p_private_display_name: privateDisplayName/);
  assert.match(saveFunction, /p_onboarding_complete: onboardingComplete/);
  assert.doesNotMatch(saveFunction, /p_user_id/);
  assert.doesNotMatch(saveFunction, /can_manage_app/);
  assert.doesNotMatch(saveFunction, /can_view_audits/);
});

test('advisor warning is classified as an intentional proved client API', () => {
  assert.equal(
    evidence.advisorClassification.classification,
    'intentional_authenticated_security_definer_api_with_behavior_proof',
  );
  assert.equal(evidence.advisorClassification.warningExpectedToRemain, true);
  assert.equal(evidence.releaseGate.authenticatedFunctionBlockerComplete, false);
});

test('migration is transactional and documents the identity transition reason', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /stale cache, alternate binary, or crafted client request/i);
  assert.match(migration, /Completion is monotonic/i);
  assert.match(migration, /role and capability columns remain outside the RPC write set/i);
  assert.match(migration, /Nullable identity inputs are explicitly rejected/i);
});
