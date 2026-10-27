import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrations = path.join(root, 'supabase', 'migrations');

const upgrade = '20260628235604_upgrade_crew_invite_acceptance.sql';
const redeem = '20260628235626_add_redeem_crew_invite_rpc.sql';
const accountability = '20260707020922_crew_accountability.sql';
const stale = '20260705010000_crew_accountability.sql';

const read = (name) => fs.readFileSync(path.join(migrations, name), 'utf8');

test('crew relationship prerequisites precede crew accountability', () => {
  assert.ok(fs.existsSync(path.join(migrations, upgrade)));
  assert.ok(fs.existsSync(path.join(migrations, redeem)));
  assert.ok(fs.existsSync(path.join(migrations, accountability)));
  assert.equal(fs.existsSync(path.join(migrations, stale)), false);
  assert.ok(upgrade < redeem);
  assert.ok(redeem < accountability);
});

test('crew invite upgrade creates the relationship columns accountability requires', () => {
  const sql = read(upgrade);
  assert.match(sql, /add column if not exists connection_status/i);
  assert.match(sql, /add column if not exists member_user_id/i);
  assert.match(sql, /add column if not exists accepted_at/i);
});

test('crew accountability consumes the canonical accepted relationship contract', () => {
  const sql = read(accountability);
  assert.match(sql, /cm\.member_user_id\s*=\s*shared_with/i);
  assert.match(sql, /cm\.connection_status\s*=\s*'accepted'/i);
});
