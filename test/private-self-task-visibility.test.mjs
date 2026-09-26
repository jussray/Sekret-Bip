import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260831233000_private_self_task_visibility.sql'),
  'utf8',
);

test('private_self tasks have an explicit fail-closed privacy scope', () => {
  assert.match(migration, /visibility in \('linked_parent', 'private_self'\)/);
  assert.match(migration, /visibility <> 'private_self'[\s\S]*created_by_role = 'teen'[\s\S]*teen_id = created_by[\s\S]*point_value = 0[\s\S]*requires_approval = false/);
});

test('linked-parent SELECT cannot see private_self rows', () => {
  assert.match(migration, /drop policy if exists bip_tasks_parent_select/);
  assert.match(migration, /drop policy if exists bip_tasks_linked_parent_select/);
  assert.match(migration, /create policy bip_tasks_linked_parent_select[\s\S]*visibility = 'linked_parent'[\s\S]*pl\.is_active = true/);
});

test('linked parents cannot create or mutate private_self rows', () => {
  assert.match(migration, /create policy bip_tasks_linked_parent_insert[\s\S]*visibility = 'linked_parent'/);
  assert.match(migration, /create policy bip_tasks_linked_parent_update[\s\S]*visibility = 'linked_parent'[\s\S]*with check \([\s\S]*visibility = 'linked_parent'/);
});

test('legacy permissive parent policy names are removed', () => {
  for (const policy of [
    'bip_tasks_parent_select',
    'bip_tasks_parent_insert',
    'bip_tasks_parent_update',
  ]) {
    assert.match(migration, new RegExp(`drop policy if exists ${policy}`));
  }
});
