import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const executable = path.join(root, 'supabase', 'migrations', '20260718_account_deletion_indexes.sql');
const archived = path.join(root, 'supabase', 'reference', 'legacy_migrations', '20260718_account_deletion_indexes.sql');

test('unrecorded account deletion index migration stays out of executable history', () => {
  assert.equal(fs.existsSync(executable), false);
  assert.equal(fs.existsSync(archived), true);
});

test('archived optimization remains preserved for later measured redesign', () => {
  const sql = fs.readFileSync(archived, 'utf8');
  assert.match(sql, /idx_messages_user_id/i);
  assert.match(sql, /idx_journal_entries_user_id/i);
  assert.match(sql, /idx_circle_members_user_id/i);
});
