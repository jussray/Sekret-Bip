import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('parent setup completes profile and continues to optional code entry', async () => {
  const source = await read('app/(onboarding)/parent-setup.tsx');
  assert.match(source, /saveAccountProfile\(\{/);
  assert.match(source, /accountSide: 'parent'/);
  assert.match(source, /submitGuardianVerification\(\)/);
  assert.match(source, /router\.replace\('\/\(onboarding\)\/parent-link'\)/);
  assert.match(source, /Continue to private code/);
  assert.doesNotMatch(source, /\['parent_profile_done', 'true'\]/);
});

test('parent link screen establishes relationship without minting Teen verification', async () => {
  const source = await read('app/(onboarding)/parent-link.tsx');
  assert.match(source, /redeemInviteCodeResult\(normalized\)/);
  assert.match(source, /result\.value\.teenUserId/);
  assert.match(source, /completeParentLink/);
  assert.match(source, /completeParentLink\(result\.value\.teenUserId\)/);
  assert.doesNotMatch(source, /completeVerifiedParentLink/);
  assert.match(source, /Teen age assurance is a separate explicit action/);
  assert.match(source, /resolveParentEntryState\(\)/);
  assert.match(source, /routeForParentEntryState\(parentEntry\)/);
  assert.match(source, /linked_teen_id/);
  assert.match(source, /handleLinkLater/);
  assert.match(source, /Continue to guardian verification/);
  assert.match(source, /router\.replace\('\/\(auth\)\/guardian-verification'\)/);
  assert.doesNotMatch(source, /parent_profile_done/);
});

test('unlinked parent routes remain gated', async () => {
  const source = await read('app/(parent)/room.tsx');
  assert.match(source, /linked_teen_id/);
  assert.match(source, /LINK_REQUIRED_ROUTES/);
  assert.match(source, /No teen linked yet/);
  assert.match(source, /Link a Teen/);
  assert.match(source, /parent-link/);
});
