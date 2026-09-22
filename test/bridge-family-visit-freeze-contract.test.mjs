import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260917235500_freeze_bridge_family_visit_authority.sql'),
  'utf8',
);

test('every loss of verified professional authority revokes active assignments', () => {
  assert.match(migration, /if p_verification_status <> 'verified' then/i);
  assert.match(migration, /update public\.bridge_case_assignments[\s\S]*set status = 'revoked'/i);
});

test('ready Family Visit evidence is immutable through the participant reflection RPC', () => {
  const start = migration.indexOf('create or replace function public.submit_bridge_family_visit_reflection');
  assert.notEqual(start, -1);
  const block = migration.slice(start);
  assert.match(block, /s\.state = 'reflection'/i);
  assert.doesNotMatch(block, /s\.state in \('reflection','ready'\)/i);
});
