import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(
  new URL('../supabase/migrations/20261020075835_reconcile_crew_private_helper_anon_execute.sql', import.meta.url),
  'utf8',
);

test('Crew private policy helper revokes anonymous EXECUTE without denying authenticated users', () => {
  assert.match(sql, /revoke execute on function private\.crew_check_in_access_is_active\(uuid,uuid,uuid\) from anon;/i);
  assert.match(sql, /has_function_privilege\('authenticated',/);
  assert.doesNotMatch(sql, /revoke\s+execute\s+on\s+function\s+private\.crew_check_in_access_is_active[^;]*from\s+authenticated/i);
  assert.doesNotMatch(sql, /grant\s+execute\s+on\s+function\s+private\.crew_check_in_access_is_active[^;]*to\s+anon/i);
});
