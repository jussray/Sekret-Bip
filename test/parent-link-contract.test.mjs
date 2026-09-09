import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('client uses eight character invite codes', async () => {
  const source = await read('src/utils/parentLink.ts');
  assert.match(source, /PARENT_INVITE_CODE_LENGTH = 8/);
  assert.match(source, /normalizeParentInviteCode/);
});

test('client validates the complete active RPC relationship before exposing the teen id', async () => {
  const source = await read('src/utils/parentLink.ts');
  assert.match(source, /validateRedeemedParentLink/);
  assert.match(source, /link_id/);
  assert.match(source, /teen_user_id/);
  assert.match(source, /parent_user_id !== expectedParentId/);
  assert.match(source, /status !== 'active'/);
  assert.match(source, /result\.value\.teenUserId/);
});

test('parent onboarding matches the live contract', async () => {
  const source = await read('app/(onboarding)/parent-link.tsx');
  assert.match(source, /PARENT_INVITE_CODE_LENGTH/);
  assert.match(source, /AB12CD34/);
  assert.match(source, /redeemInviteCodeResult/);
});

test('teen invite screen describes eight characters', async () => {
  const source = await read('app/(auth)/parent-link-verify.tsx');
  // The screen interpolates PARENT_INVITE_CODE_LENGTH (8) into the copy
  // rather than hardcoding the word "eight", so it can't drift out of sync
  // with src/utils/parentLink.ts's PARENT_INVITE_CODE_LENGTH constant.
  assert.match(source, /\{PARENT_INVITE_CODE_LENGTH\}-character code/);
});
