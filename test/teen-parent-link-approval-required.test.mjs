import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('adult code redemption stays pending until the teen explicitly approves', () => {
  const sql = read('supabase/migrations/20261108014000_require_teen_parent_link_confirmation.sql');
  const redeem = sql.split('create or replace function public.redeem_parent_link_invite')[1]
    .split('create or replace function public.approve_parent_link_request')[0];
  assert.match(redeem, /status = 'pending'/);
  assert.match(redeem, /is_active = false/);
  assert.doesNotMatch(redeem, /status = 'active'/);
  assert.match(redeem, /parent_link_state = 'pending'/);
});

test('teen-only approval uses the exact linked teen owner and authenticated RPC', () => {
  const sql = read('supabase/migrations/20261108014000_require_teen_parent_link_confirmation.sql');
  const approve = sql.split('create or replace function public.approve_parent_link_request')[1]
    .split('create or replace function public.revoke_parent_link')[0];
  assert.match(approve, /teen_user_id = v_teen_id/);
  assert.match(approve, /for update/);
  assert.match(approve, /status = 'active'/);
  assert.match(approve, /status = 'revoked'/);
  assert.doesNotMatch(approve, /set\\s+verification_state\\s*=/);
  assert.match(sql, /revoke all on function public.approve_parent_link_request/);
});

test('onboarding cannot treat a pending request as linked access', () => {
  const helper = read('src/utils/parentLink.ts');
  const onboarding = read('app/(onboarding)/parent-link.tsx');
  const status = read('src/components/settings/ParentLinkStatusCard.tsx');
  assert.match(helper, /row.status !== 'pending'/);
  assert.match(onboarding, /Request teen approval/);
  assert.match(onboarding, /setPendingApproval\\(true\\)/);
  assert.doesNotMatch(onboarding, /await completeParentLink\\(/);
  assert.match(status, /Approve parent request/);
  assert.match(status, /Reject parent request/);
});
