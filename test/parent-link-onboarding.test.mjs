import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ParentOnboarding component exists and exports form interface', async () => {
  const source = await read('components/ParentOnboarding.tsx');
  assert.match(source, /export default function ParentOnboarding/);
  assert.match(source, /export interface ParentOnboardingFormData/);
  assert.match(source, /email: string/);
  assert.match(source, /password: string/);
  assert.match(source, /passwordVerify: string/);
  assert.match(source, /onSubmit: \(data: ParentOnboardingFormData\)/);
  assert.match(source, /placeholder="guardian@example.com"/);
  assert.match(source, /secureTextEntry=/);
  assert.match(source, /onChangeText=\{handleVerifyChange\}/);
});

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
  assert.match(source, /result\.value\.status !== 'pending'/);
  assert.match(source, /setPendingApproval\(true\)/);
  assert.doesNotMatch(source, /completeParentLink/);
  assert.doesNotMatch(source, /completeVerifiedParentLink/);
  assert.match(source, /Teen age assurance is a separate explicit action/);
  assert.match(source, /Request sent\. Your teen must approve it/);
  assert.match(source, /Request teen approval/);
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
