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
  '20260713052603_harden_notification_delivery_ledger.sql',
);
const sendPushPath = path.join(root, 'supabase', 'functions', 'send-push', 'index.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const sendPush = fs.readFileSync(sendPushPath, 'utf8');

test('notification delivery ledger denies all client roles explicitly', () => {
  assert.match(migration, /alter table public\.notification_deliveries enable row level security/i);
  assert.match(
    migration,
    /revoke all on table public\.notification_deliveries\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    migration,
    /create policy notification_deliveries_deny_clients[\s\S]*to anon, authenticated[\s\S]*using \(false\)[\s\S]*with check \(false\)/i,
  );
});

test('service role receives only the table privileges used by send-push', () => {
  assert.match(
    migration,
    /grant select, insert on table public\.notification_deliveries\s+to service_role/i,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*(update|delete|truncate)[^;]*notification_deliveries[^;]*service_role/i,
  );
  assert.match(
    migration,
    /grant usage on sequence public\.notification_deliveries_id_seq\s+to service_role/i,
  );
  assert.doesNotMatch(
    migration,
    /grant[^;]*(select|update)[^;]*notification_deliveries_id_seq[^;]*service_role/i,
  );
});

test('send-push uses the internal ledger only for cooldown reads and delivery inserts', () => {
  const ledgerCalls = sendPush.match(/\.from\('notification_deliveries'\)[\s\S]{0,300}/g) ?? [];
  assert.equal(ledgerCalls.length, 2);
  assert.match(ledgerCalls[0], /\.select\('id'/);
  assert.match(ledgerCalls[1], /\.insert\(/);

  for (const call of ledgerCalls) {
    assert.doesNotMatch(call, /\.(update|delete|upsert)\(/);
  }
});

test('migration documents the server-only trust boundary and rollback remains simple', () => {
  assert.match(migration, /Server-only push notification cooldown and delivery ledger/i);
  assert.match(migration, /^begin;/im);
  assert.match(migration, /commit;\s*$/i);

  // Rollback: revoke service_role access, drop the deny policy, then restore the
  // previous service_role grants only if a release rollback is required.
  assert.doesNotMatch(migration, /grant[^;]*to (anon|authenticated)/i);
});
