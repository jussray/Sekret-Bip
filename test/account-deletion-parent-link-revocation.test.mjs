import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const processor = read('supabase/functions/account-delete/index.ts');
const parentLinksSchema = read('supabase/migrations/0003_oracle_parentlinks_period_safety.sql');
const revokeRpc = read('supabase/migrations/20261108014000_require_teen_parent_link_confirmation.sql');

test('parent_links.parent_user_id uses ON DELETE SET NULL, not CASCADE (the gap this fix addresses)', () => {
  // This is the actual live schema behavior the fix in account-delete/index.ts
  // compensates for. If a future migration changes this to CASCADE, the
  // revokeParentLinksForDeletedParent step becomes unreachable dead code
  // (harmless, since the lookup would just find zero rows) rather than wrong,
  // but it would be worth knowing that schema behavior changed.
  assert.match(parentLinksSchema, /parent_user_id uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/);
  assert.match(parentLinksSchema, /teen_user_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
});

test('account deletion explicitly revokes parent_links where the deleted account is the parent', () => {
  assert.match(processor, /async function revokeParentLinksForDeletedParent/);
  assert.match(processor, /\.eq\('parent_user_id', userId\)/);
  assert.match(processor, /await revokeParentLinksForDeletedParent\(admin, userId\)/);
  // Must run before the auth user is deleted, while parent_user_id still
  // points at a real (about-to-be-deleted) user id.
  const revokeCallIndex = processor.indexOf('await revokeParentLinksForDeletedParent(admin, userId)');
  const authDeleteIndex = processor.indexOf('admin.auth.admin.deleteUser(userId)');
  assert.ok(revokeCallIndex > -1 && authDeleteIndex > -1);
  assert.ok(revokeCallIndex < authDeleteIndex, 'parent_links must be revoked before the auth user is deleted');
});

test('the revoke mirrors the exact terminal state revoke_parent_link already uses, not an invented status', () => {
  for (const field of [
    "status: 'revoked'",
    'is_active: false',
    'invite_code: null',
    'expires_at: null',
  ]) {
    assert.ok(processor.includes(field), `account-delete must set ${field} on parent_links, matching revoke_parent_link`);
  }
  assert.match(processor, /parent_link_state: 'revoked'/);

  // Cross-check against the live RPC's own terminal state so this doesn't
  // silently drift from the canonical revoke semantics.
  assert.match(revokeRpc, /status = 'revoked'/);
  assert.match(revokeRpc, /is_active = false/);
  assert.match(revokeRpc, /parent_link_state = 'revoked'/);
});

test('a failed parent_links revoke fails the whole deletion closed, same as crew_member cleanup', () => {
  assert.match(processor, /parent_link_revoke_failed/);
  assert.match(processor, /parent_link_verification_update_failed/);
  // No silent catch around the new step — it must throw into the same
  // outer try/catch that marks the deletion request failed and retryable.
  const fnStart = processor.indexOf('async function revokeParentLinksForDeletedParent');
  const fnEnd = processor.indexOf('\n}\n', fnStart);
  const fnBody = processor.slice(fnStart, fnEnd);
  assert.doesNotMatch(fnBody, /catch/);
});
