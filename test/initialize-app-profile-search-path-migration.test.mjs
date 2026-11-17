import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const historicalMigration = fs.readFileSync(
  'supabase/migrations/20260726093000_external_user_signup_defaults.sql',
  'utf8',
);
const hardeningMigration = fs.readFileSync(
  'supabase/migrations/20260726214500_harden_initialize_app_profile_search_path.sql',
  'utf8',
);

test('preserves applied migration history and hardens the trigger through a new version', () => {
  assert.match(historicalMigration, /set search_path = public, auth/);
  assert.match(hardeningMigration, /alter function public\.initialize_app_profile\(\)/);
  assert.match(hardeningMigration, /set search_path = pg_catalog, pg_temp/);
  assert.doesNotMatch(hardeningMigration, /create or replace function/);
});
