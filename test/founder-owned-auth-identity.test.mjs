import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260813222000_founder_owned_auth_identity.sql',
);
const sql = fs.readFileSync(migrationPath, 'utf8');

test('founder promotion requires the owned confirmed non-anonymous mailbox', () => {
  assert.match(sql, /founder@sekretbip\.net/);
  assert.match(sql, /email_confirmed_at is not null/i);
  assert.match(sql, /coalesce\(new\.is_anonymous, false\) = false/i);
  assert.match(sql, /role = 'founder'/i);
  assert.match(sql, /can_view_audits = true/i);
  assert.match(sql, /can_manage_app = true/i);
});

test('founder privilege is revoked if the owned identity boundary stops matching', () => {
  assert.match(sql, /lower\(coalesce\(old\.email, ''\)\) = founder_email/i);
  assert.match(sql, /role = 'user'/i);
  assert.match(sql, /can_view_audits = false/i);
  assert.match(sql, /can_manage_app = false/i);
  assert.match(sql, /where user_id = new\.id\s+and role = 'founder'/i);
});

test('founder bootstrap function is not client executable', () => {
  assert.match(
    sql,
    /revoke all on function public\.sync_owned_founder_profile\(\) from public, anon, authenticated;/i,
  );
  assert.match(sql, /after insert on auth\.users/i);
  assert.match(sql, /after update of email, email_confirmed_at, is_anonymous on auth\.users/i);
});
