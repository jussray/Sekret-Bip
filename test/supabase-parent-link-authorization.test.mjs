import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const rpcMigrationPath = path.join(migrationsDir, '20260713154809_harden_parent_link_rpc_behavior.sql');
const revokeMigrationPath = path.join(
  migrationsDir,
  '20260713155855_preserve_safety_state_on_parent_link_revoke.sql',
);
const rpcProbePath = path.join(root, 'supabase', 'probes', 'authorization_parent_link_rpc_phase1.sql');
const revokeProbePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_parent_link_revoke_phase1.sql',
);

const rpcMigration = fs.readFileSync(rpcMigrationPath, 'utf8');
const revokeMigration = fs.readFileSync(revokeMigrationPath, 'utf8');
const rpcProbe = fs.readFileSync(rpcProbePath, 'utf8');
const revokeProbe = fs.readFileSync(revokeProbePath, 'utf8');

test('parent-link RPC migration files exist at their expected versioned paths', () => {
  assert.equal(fs.existsSync(rpcMigrationPath), true);
  assert.equal(fs.existsSync(revokeMigrationPath), true);
});

test('create_parent_link_invite is security definer with a fixed search path', () => {
  assert.match(rpcMigration, /create or replace function public\.create_parent_link_invite\(\)/i);
  assert.match(rpcMigration, /security definer/i);
  assert.match(rpcMigration, /set search_path = public, auth/i);
});

test('create_parent_link_invite denies anonymous sessions', () => {
  assert.match(rpcMigration, /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/i);
  assert.match(rpcMigration, /is_anonymous/i);
});

test('create_parent_link_invite restricts access to completed teen accounts only', () => {
  assert.match(rpcMigration, /account_side.*'teen'/i);
  assert.match(rpcMigration, /completed teen profile required/i);
});

test('revoke_parent_link is security definer with a fixed search path', () => {
  assert.match(revokeMigration, /create or replace function public\.revoke_parent_link\(/i);
  assert.match(revokeMigration, /security definer/i);
  assert.match(revokeMigration, /set search_path = public, auth/i);
});

test('revoke_parent_link preserves safety state independently from relationship revocation', () => {
  assert.match(revokeMigration, /verification_state/i);
  assert.match(revokeMigration, /parent_link_state/i);
  assert.match(revokeMigration, /verification_reason/i);
  assert.match(revokeMigration, /SUSPENDED/i);
});

test('revoke_parent_link denies anonymous-authenticated callers', () => {
  assert.match(revokeMigration, /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/i);
  assert.match(revokeMigration, /is_anonymous/i);
});

test('parent-link RPC probe is rollback-contained with synthetic auth users only', () => {
  assert.match(rpcProbe, /^-- Se'kret Bip authenticated parent-link RPC Phase 1 proof harness/m);
  assert.match(rpcProbe, /\bbegin;/i);
  assert.match(rpcProbe, /\brollback;\s*$/i);
  assert.doesNotMatch(rpcProbe, /\bcommit;/i);
  assert.match(rpcProbe, /insert\s+into\s+auth\.users/i);
  assert.match(rpcProbe, /@sekret\.invalid/i);
  assert.doesNotMatch(rpcProbe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('parent-link RPC probe covers invite lifecycle, denial, and one-time redemption', () => {
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
    assert.match(rpcProbe, new RegExp(check), `RPC probe missing check: ${check}`);
  }
});

test('parent-link revoke probe is rollback-contained with synthetic auth users only', () => {
  assert.match(revokeProbe, /^-- Se'kret Bip authenticated parent-link revoke Phase 1 proof harness/m);
  assert.match(revokeProbe, /\bbegin;/i);
  assert.match(revokeProbe, /\brollback;\s*$/i);
  assert.doesNotMatch(revokeProbe, /\bcommit;/i);
  assert.match(revokeProbe, /insert\s+into\s+auth\.users/i);
  assert.match(revokeProbe, /@sekret\.invalid/i);
  assert.doesNotMatch(revokeProbe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('parent-link revoke probe covers teen, parent, unrelated, anonymous, and safety-state preservation', () => {
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
    assert.match(revokeProbe, new RegExp(check), `Revoke probe missing check: ${check}`);
  }
});
