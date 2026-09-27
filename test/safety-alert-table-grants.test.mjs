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
  '20260808223500_lock_safety_alert_table_grants.sql',
);
const migration = fs.readFileSync(migrationPath, 'utf8');

test('authenticated safety-alert access is reset to SELECT only', () => {
  assert.match(
    migration,
    /revoke all on table public\.safety_alerts from authenticated;/i,
  );
  assert.match(
    migration,
    /grant select on table public\.safety_alerts to authenticated;/i,
  );
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|truncate|trigger|references)/i);
});

test('grant hardening is transactional and scoped to safety_alerts', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /alter table/i);
  assert.doesNotMatch(migration, /drop table/i);
});
