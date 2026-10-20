import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const parentLink = fs.readFileSync(new URL('../src/utils/parentLink.ts', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../app/(onboarding)/parent-link.tsx', import.meta.url), 'utf8');

test('redeemed parent-link response validates the full active relationship', () => {
  assert.match(parentLink, /export function validateRedeemedParentLink/);
  assert.match(parentLink, /row\.link_id[^\n]*UUID_PATTERN/);
  assert.match(parentLink, /row\.teen_user_id[^\n]*UUID_PATTERN/);
  assert.match(parentLink, /row\.parent_user_id !== expectedParentId/);
  assert.match(parentLink, /row\.status !== 'active'/);
  assert.match(parentLink, /row\.activated_at != null/);
});

test('redemption returns a typed verified relationship rather than a raw teen id', () => {
  assert.match(parentLink, /Promise<ParentLinkResult<RedeemedParentLink>>/);
  assert.match(parentLink, /return \{ ok: true, value: redeemedLink \}/);
  assert.match(parentLink, /return result\.ok \? result\.value\.teenUserId : null/);
});

test('parent onboarding enters the next route only from the validated response', () => {
  assert.match(onboarding, /result\.value\.teenUserId/);
  assert.match(onboarding, /resolveParentEntryState\(\)/);
  assert.match(onboarding, /routeForParentEntryState\(parentEntry\)/);
  assert.doesNotMatch(onboarding, /completeVerifiedParentLink\(result\.value\)/);
});

test('failed redemption clears only the relationship hint, not completed profile identity', () => {
  assert.match(onboarding, /AsyncStorage\.removeItem\('linked_teen_id'\)/);
  assert.doesNotMatch(onboarding, /multiRemove\(\['parent_profile_done', 'linked_teen_id'\]\)/);
});
