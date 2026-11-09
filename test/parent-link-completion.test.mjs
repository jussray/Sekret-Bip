import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const parentLink = fs.readFileSync(new URL('../src/utils/parentLink.ts', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../app/(onboarding)/parent-link.tsx', import.meta.url), 'utf8');

test('redeemed parent-link response validates the pending relationship request', () => {
  assert.match(parentLink, /export function validateRedeemedParentLink/);
  assert.match(parentLink, /row\.link_id[^\n]*UUID_PATTERN/);
  assert.match(parentLink, /row\.teen_user_id[^\n]*UUID_PATTERN/);
  assert.match(parentLink, /row\.parent_user_id !== expectedParentId/);
  assert.match(parentLink, /row\.status !== 'pending'/);
  assert.match(parentLink, /row\.activated_at != null/);
});

test('redemption returns typed pending receipt, while legacy adapter exposes no teen id', () => {
  assert.match(parentLink, /Promise<ParentLinkResult<RedeemedParentLink>>/);
  assert.match(parentLink, /return \{ ok: true, value: redeemedLink \}/);
  assert.match(parentLink, /await redeemInviteCodeResult\(code\);[\s\S]*?return null/);
});

test('parent onboarding keeps adult in pending state until the Teen confirms', () => {
  assert.match(onboarding, /result\.value\.status !== 'pending'/);
  assert.match(onboarding, /setPendingApproval\(true\)/);
  assert.doesNotMatch(onboarding, /completeParentLink\(/);
  assert.doesNotMatch(onboarding, /completeVerifiedParentLink\(result\.value\)/);
});

test('failed redemption clears only the relationship hint, not completed profile identity', () => {
  assert.match(onboarding, /AsyncStorage\.removeItem\('linked_teen_id'\)/);
  assert.doesNotMatch(onboarding, /multiRemove\(\['parent_profile_done', 'linked_teen_id'\]\)/);
});
