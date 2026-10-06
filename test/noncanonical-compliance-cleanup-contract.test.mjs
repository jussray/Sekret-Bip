import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const candidate = await readFile(
  new URL('../supabase/candidates/remove_noncanonical_compliance_foundation.sql', import.meta.url),
  'utf8',
);
const cleanup = await readFile(
  new URL('../supabase/migrations/20261006025600_remove_noncanonical_compliance_foundation.sql', import.meta.url),
  'utf8',
);
const recovered = await readFile(
  new URL('../supabase/migrations/20261004215523_compliance_foundation.sql', import.meta.url),
  'utf8',
);

test('recovered compliance migration preserves the exact production-history identity', () => {
  assert.match(recovered, /RECOVERED PRODUCTION HISTORY/);
  assert.match(recovered, /CREATE TABLE IF NOT EXISTS user_profiles/);
  assert.match(recovered, /CREATE TABLE IF NOT EXISTS consent_log/);
  assert.match(recovered, /CREATE OR REPLACE FUNCTION request_account_deletion\(\)/);
  assert.match(recovered, /CREATE OR REPLACE FUNCTION request_data_export\(\)/);
});

test('promoted cleanup migration stays bound to the reviewed candidate', () => {
  assert.match(cleanup, /Promote reviewed cleanup for non-canonical compliance objects/);
  assert.ok(cleanup.endsWith(candidate), 'production migration must preserve the reviewed candidate SQL exactly');
});

test('cleanup fails closed on data and removes only the non-canonical duplicate path', () => {
  assert.match(cleanup, /select count\(\*\) from public\.user_profiles/i);
  assert.match(cleanup, /select count\(\*\) from public\.consent_log/i);
  assert.match(cleanup, /RAISE EXCEPTION/);
  assert.match(cleanup, /DROP FUNCTION IF EXISTS public\.request_account_deletion\(\)/);
  assert.match(cleanup, /DROP FUNCTION IF EXISTS public\.request_data_export\(\)/);
  assert.match(cleanup, /DROP FUNCTION IF EXISTS public\.has_given_consent\(text\)/);
  assert.match(cleanup, /DROP FUNCTION IF EXISTS public\.record_initial_consent\(date, text, text, text, boolean, text, text\)/);
  assert.match(cleanup, /DROP TABLE IF EXISTS public\.consent_log/);
  assert.match(cleanup, /DROP TABLE IF EXISTS public\.user_profiles/);
  assert.doesNotMatch(cleanup, /\bCASCADE\b/i);
});
