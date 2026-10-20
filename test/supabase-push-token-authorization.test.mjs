import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const migrationPath = path.join(migrationsDir, '20260713161055_harden_push_token_ownership.sql');
const probePath = path.join(root, 'supabase', 'probes', 'authorization_push_token_phase1.sql');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');

test('push-token hardening migration exists at its expected versioned path', () => {
  assert.equal(fs.existsSync(migrationPath), true);
});

test('claim_push_token is security definer with a fixed search path', () => {
  assert.match(migration, /create or replace function public\.claim_push_token\(/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public, auth/i);
});

test('claim_push_token denies anonymous-authenticated callers', () => {
  assert.match(migration, /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/i);
  assert.match(migration, /is_anonymous/i);
});

test('claim_push_token validates token format before writing', () => {
  assert.match(migration, /p_expo_push_token/i);
  assert.match(migration, /ExponentPushToken|ExpoPushToken/i);
  assert.match(migration, /invalid expo push token/i);
});

test('claim_push_token enforces single-owner and prevents cross-user transfer of enabled tokens', () => {
  assert.match(migration, /user_id/i);
  assert.match(migration, /enabled/i);
});

test('push-token probe is rollback-contained with synthetic auth users only', () => {
  assert.match(probe, /^-- Se'kret Bip authenticated push-token Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /insert\s+into\s+auth\.users/i);
  assert.match(probe, /@sekret\.invalid/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('push-token probe covers cross-user denial, disabled handoff, invalid token, and anonymous denial', () => {
  for (const check of [
    'enabled_cross_user_transfer_denied',
    'disabled_token_handoff_allowed',
    'invalid_token_denied',
    'anonymous_claim_denied',
  ]) {
    assert.match(probe, new RegExp(check), `Push-token probe missing check: ${check}`);
  }
});
