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
  '20260808222500_reconcile_safety_alert_runtime_schema.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_safety_alert_runtime_schema_phase1.sql',
);
const runtimeMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '0003_oracle_parentlinks_period_safety.sql',
);
const coordinatorPath = path.join(root, 'src', 'features', 'safety', 'safetyCoordinator.ts');
const edgePath = path.join(root, 'supabase', 'functions', 'safety-scan', 'index.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const recordedRuntime = fs.readFileSync(runtimeMigrationPath, 'utf8');
const coordinator = fs.readFileSync(coordinatorPath, 'utf8');
const edge = fs.readFileSync(edgePath, 'utf8');

test('reconciliation follows the recorded canonical safety runtime contract', () => {
  for (const column of ['user_id', 'source_table', 'source_id', 'reviewed_by_parent', 'parent_notified_at']) {
    assert.match(recordedRuntime, new RegExp(`\\b${column}\\b`, 'i'));
    assert.match(migration, new RegExp(`add column if not exists ${column}\\b`, 'i'));
  }

  assert.match(coordinator, /\.eq\('user_id', user\.id\)/);
  assert.match(coordinator, /parent_notified_at/);
  assert.match(
    edge,
    /\.insert\(\{[\s\S]*user_id:\s*metadata\.user_id,[\s\S]*source_table:\s*sourceTable,[\s\S]*source_id:\s*metadata\.record_id,/i,
  );
  assert.match(edge, /parent_notified_at/);
});

test('legacy columns remain compatible when present but are not required by fresh replay', () => {
  assert.match(migration, /information_schema\.columns[\s\S]*column_name = 'teen_user_id'/i);
  assert.match(migration, /set user_id = teen_user_id/i);
  assert.match(
    migration,
    /array\['teen_user_id', 'parent_user_id', 'title', 'summary'\]/i,
  );
  assert.match(migration, /alter table public\.safety_alerts alter column %I drop not null/i);
  assert.doesNotMatch(migration, /drop column/i);
  assert.doesNotMatch(migration, /drop table/i);
});

test('canonical owner column is required and protected by an auth foreign key', () => {
  assert.match(migration, /alter column user_id set not null/i);
  assert.match(migration, /safety_alerts_user_id_fkey/i);
  assert.match(migration, /foreign key \(user_id\) references auth\.users\(id\) on delete cascade/i);
});

test('legacy link trigger is removed because relationship authorization lives in read RLS', () => {
  assert.match(migration, /drop trigger if exists trg_safety_alerts_link on public\.safety_alerts/i);
  assert.match(migration, /pl\.teen_user_id = safety_alerts\.user_id/i);
  assert.match(migration, /pl\.parent_user_id = auth\.uid\(\)/i);
  assert.match(migration, /pl\.status = 'active'/i);
  assert.match(migration, /pl\.is_active = true/i);
});

test('clients are read-only on safety alerts', () => {
  assert.match(migration, /revoke all on table public\.safety_alerts from anon/i);
  assert.match(migration, /revoke insert, update, delete on table public\.safety_alerts from authenticated/i);
  assert.match(migration, /grant select on table public\.safety_alerts to authenticated/i);
  assert.doesNotMatch(migration, /create policy .*insert/i);
  assert.doesNotMatch(migration, /create policy .*update/i);
});

test('teen and linked-parent reads are explicit and non-anonymous', () => {
  assert.match(migration, /create policy "safety_alerts: teen read"/i);
  assert.match(migration, /public\.is_non_anonymous_user\(\)[\s\S]*auth\.uid\(\) = user_id/i);
  assert.match(migration, /create policy "safety_alerts: linked parent read"/i);
  assert.match(migration, /public\.is_non_anonymous_user\(\)[\s\S]*exists \(/i);
});

test('dynamic proof covers canonical insert, owner, linked parent, stranger, client write, and revoke', () => {
  for (const check of [
    'canonical_service_insert_allowed',
    'teen_owner_read_allowed',
    'linked_parent_read_allowed',
    'unrelated_user_read_denied',
    'authenticated_client_insert_denied',
    'revoked_parent_read_denied',
  ]) {
    assert.match(probe, new RegExp(check));
  }
  assert.match(probe, /expected 6 safety runtime checks/i);
  assert.match(probe, /where passed is not true/i);
});

test('dynamic proof is synthetic and rollback-contained', () => {
  assert.match(probe, /^-- Se'kret Bip safety-alert runtime-schema proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.match(probe, /@sekret\.invalid/i);
});

test('migration is transactional and adds an owner-time index', () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /idx_safety_alerts_user_created/i);
  assert.match(migration, /\(user_id, created_at desc\)/i);
});