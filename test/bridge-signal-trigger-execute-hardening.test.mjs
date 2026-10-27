import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const liveMigrationPath = 'supabase/migrations/20260714221745_revoke_bridge_signal_trigger_execute.sql';
const stalePlannedPath = 'supabase/migrations/20260714221500_revoke_bridge_signal_trigger_execute.sql';
const sourceMigration = fs.readFileSync(
  'supabase/migrations/20260714043000_humane_retention_loops.sql',
  'utf8',
);
const hardeningMigration = fs.readFileSync(liveMigrationPath, 'utf8');

test('repository migration filename matches the applied Supabase version exactly', () => {
  assert.equal(fs.existsSync(liveMigrationPath), true);
  assert.equal(fs.existsSync(stalePlannedPath), false);
});

test('Bridge activity function remains a trigger with metadata-only payload', () => {
  assert.match(sourceMigration, /create or replace function public\.record_bridge_signal_activity\(\)/i);
  assert.match(sourceMigration, /returns trigger/i);
  assert.match(sourceMigration, /after insert on public\.bridge_signals/i);
  assert.match(sourceMigration, /'sourceId'/);
  assert.match(sourceMigration, /'responsePreference'/);
  assert.doesNotMatch(sourceMigration, /new\.summary/i);
});

test('client roles cannot directly execute the SECURITY DEFINER trigger function', () => {
  assert.match(
    hardeningMigration,
    /revoke all on function public\.record_bridge_signal_activity\(\)[\s\S]*from public, anon, authenticated;/i,
  );
  assert.doesNotMatch(
    hardeningMigration,
    /grant execute on function public\.record_bridge_signal_activity\(\)[\s\S]*to (public|anon|authenticated)/i,
  );
  assert.match(hardeningMigration, /Trigger-only metadata activity recorder/i);
});
