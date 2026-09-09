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
  '20260713011803_harden_config_table_grants.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

test('config grant migration is replay-safe when out-of-band tables are absent', () => {
  assert.match(sql, /to_regclass\(format\('public\.%I', config_table\)\) is null/i);
  assert.match(sql, /continue;/i);
  assert.match(sql, /array\['app_config', 'app_private_config'\]/i);
});

test('config grant migration keeps RLS enabled when either server-owned table exists', () => {
  assert.match(sql, /alter table public\.%I enable row level security/i);
});

test('config grant migration revokes every client and PUBLIC table privilege', () => {
  assert.match(
    sql,
    /revoke all privileges on table public\.%I from public, anon, authenticated/i,
  );
  assert.doesNotMatch(sql, /grant\s+.+\s+to\s+(anon|authenticated|public)\b/i);
});

test('config grant migration preserves explicit service-role access', () => {
  assert.match(sql, /grant all privileges on table public\.%I to service_role/i);
});

test('config grant migration does not create config tables or mutate configuration rows', () => {
  assert.doesNotMatch(sql, /create\s+table/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.doesNotMatch(sql, /^\s*(insert|update|delete|truncate)\b/im);
});

test('config grant migration documents server-only intent for both table names', () => {
  assert.match(sql, /app_config/i);
  assert.match(sql, /app_private_config/i);
  assert.match(sql, /Client roles have no table privileges and no RLS policies/i);
});
