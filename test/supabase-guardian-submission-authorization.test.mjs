import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const helperMigrationPath = path.join(
  migrationsDir,
  '20260713073608_restrict_guardian_review_helper_execute.sql',
);
const submissionMigrationPath = path.join(
  migrationsDir,
  '20260713074443_harden_guardian_verification_submission.sql',
);
const helperProbePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_guardian_helper_execute_phase1.sql',
);
const submissionProbePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_guardian_submission_phase1.sql',
);

const helperMigration = fs.readFileSync(helperMigrationPath, 'utf8');
const submissionMigration = fs.readFileSync(submissionMigrationPath, 'utf8');
const helperProbe = fs.readFileSync(helperProbePath, 'utf8');
const submissionProbe = fs.readFileSync(submissionProbePath, 'utf8');

test('guardian authorization migration files exist at their expected versioned paths', () => {
  assert.equal(fs.existsSync(helperMigrationPath), true);
  assert.equal(fs.existsSync(submissionMigrationPath), true);
});

test('can_manage_guardian_reviews execute is revoked from client roles', () => {
  assert.match(helperMigration, /revoke all on function public\.can_manage_guardian_reviews\(\)/i);
  assert.match(helperMigration, /from public, anon, authenticated/i);
});

test('can_manage_guardian_reviews execute is restricted to service_role', () => {
  assert.match(helperMigration, /grant execute on function public\.can_manage_guardian_reviews\(\)/i);
  assert.match(helperMigration, /to service_role/i);
  assert.doesNotMatch(helperMigration, /to authenticated/i);
});

test('submit_guardian_verification is security definer with a fixed search path', () => {
  assert.match(submissionMigration, /create or replace function public\.submit_guardian_verification\(\)/i);
  assert.match(submissionMigration, /security definer/i);
  assert.match(submissionMigration, /set search_path = public, auth/i);
});

test('submit_guardian_verification denies anonymous-authenticated callers', () => {
  assert.match(
    submissionMigration,
    /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/i,
  );
  assert.match(submissionMigration, /is_anonymous/i);
});

test('submit_guardian_verification requires a completed parent profile with a guardian Circle identity', () => {
  assert.match(submissionMigration, /completed parent profile required/i);
  assert.match(submissionMigration, /guardian circle profile required/i);
  assert.match(submissionMigration, /circle_profiles/i);
});

test('guardian helper execute probe is rollback-contained', () => {
  assert.match(helperProbe, /^-- Se'kret Bip guardian helper execution Phase 1 proof harness/m);
  assert.match(helperProbe, /\bbegin;/i);
  assert.match(helperProbe, /\brollback;\s*$/i);
  assert.doesNotMatch(helperProbe, /\bcommit;/i);
});

test('guardian helper probe covers normal, founder, and grant-boundary checks', () => {
  for (const check of [
    'normal_direct_helper_denied',
    'normal_queue_rpc_denied',
    'normal_review_rpc_denied',
    'founder_direct_helper_denied',
    'founder_queue_rpc_allowed',
    'founder_review_reaches_target_validation',
    'guardian_helper_grants_are_least_privilege',
  ]) {
    assert.match(helperProbe, new RegExp(check), `Guardian helper probe missing check: ${check}`);
  }
});

test('guardian submission probe is rollback-contained with synthetic auth users only', () => {
  assert.match(submissionProbe, /\bbegin;/i);
  assert.match(submissionProbe, /\brollback;\s*$/i);
  assert.doesNotMatch(submissionProbe, /\bcommit;/i);
  assert.match(submissionProbe, /insert\s+into\s+auth\.users/i);
  assert.match(submissionProbe, /@sekret\.invalid/i);
  assert.doesNotMatch(submissionProbe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('guardian submission probe covers valid submission, idempotency, scope, and denial boundaries', () => {
  for (const check of [
    'valid_guardian_submission_succeeds',
    'verified_guardian_is_idempotent',
    'submission_is_self_scoped',
    'missing_circle_denied',
    'teen_circle_identity_denied',
    'teen_profile_denied',
    'incomplete_parent_denied',
    'anonymous_session_denied',
    'suspended_guardian_denied',
  ]) {
    assert.match(submissionProbe, new RegExp(check), `Guardian submission probe missing check: ${check}`);
  }
});
