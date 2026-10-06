import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../supabase/migrations/20261006030000_harden_noncanonical_compliance_rpc_access.sql', import.meta.url),
  'utf8',
);

test('noncanonical compliance RPC containment is non-destructive and fail-closed for clients', () => {
  for (const signature of [
    'request_account_deletion()',
    'request_data_export()',
    'has_given_consent(text)',
    'record_initial_consent(date, text, text, text, boolean, text, text)',
    'touch_user_profile_updated_at()',
  ]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature.replace(/[()]/g, '\\$&')} FROM anon`));
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature.replace(/[()]/g, '\\$&')} FROM authenticated`));
  }
  assert.doesNotMatch(migration, /\bDROP\b/i);
  assert.doesNotMatch(migration, /\bDELETE\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test('noncanonical compliance user RPCs remain service-role recoverable', () => {
  for (const signature of [
    'request_account_deletion()',
    'request_data_export()',
    'has_given_consent(text)',
    'record_initial_consent(date, text, text, text, boolean, text, text)',
  ]) {
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${signature.replace(/[()]/g, '\\$&')} TO service_role`));
  }
});
