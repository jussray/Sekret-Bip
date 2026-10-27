import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrationPath = path.join(
  migrationsDir,
  '20260713162809_lock_completed_account_profile_identity.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_account_profile_identity_phase1.sql',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');

test('account-profile identity migration exists at its expected versioned path', () => {
  assert.equal(fs.existsSync(migrationPath), true);
});

test('upsert_own_bip_profile is security definer with a fixed search path', () => {
  assert.match(migration, /create or replace function public\.upsert_own_bip_profile\(/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public, auth/i);
});

test('upsert_own_bip_profile denies anonymous-authenticated callers', () => {
  assert.match(migration, /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/i);
  assert.match(migration, /is_anonymous/i);
});

test('upsert_own_bip_profile prevents account_side pivot once a profile is completed', () => {
  assert.match(migration, /account_side/i);
  assert.match(migration, /onboarding_complete/i);
  assert.match(migration, /completed account side cannot change/i);
});

test('upsert_own_bip_profile prevents downgrading a completed profile', () => {
  assert.match(migration, /completed profile cannot return to onboarding/i);
});

test('account-profile identity probe is rollback-contained with synthetic auth users only', () => {
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /insert\s+into\s+auth\.users/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('account-profile probe covers completion, side-lock, downgrade denial, and anonymous denial', () => {
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
    assert.match(probe, new RegExp(check), `Account-profile probe missing check: ${check}`);
  }
});
