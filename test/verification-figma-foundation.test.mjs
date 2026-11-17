import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('verification states and route targets remain explicit', async () => {
  const source = await read('src/services/verificationState.ts');
  for (const state of [
    'UNVERIFIED',
    'PENDING_PARENT',
    'PENDING_TRUSTED_ADULT',
    'LIMITED_MODE',
    'VERIFIED_TEEN',
    'EXPIRED',
    'MANUAL_REVIEW',
    'SUSPENDED',
  ]) {
    assert.match(source, new RegExp(state));
  }
  assert.match(source, /getVerificationRouteTarget/);
  assert.match(source, /canUnlockSocial/);
});

test('Figma foundation contains required first screens', async () => {
  const source = await read('src/constants/figmaFrames.ts');
  for (const key of [
    'welcome',
    'teenOnboarding',
    'parentOnboarding',
    'limitedMode',
    'parentLinkVerify',
    'emergencyAlert',
    'parentDoorbell',
    'profile',
  ]) {
    assert.match(source, new RegExp(key));
  }
});

test('Figma foundation covers the terminal verification states the guard routes to', async () => {
  const source = await read('src/constants/figmaFrames.ts');
  // decideRouteAccess redirects MANUAL_REVIEW and SUSPENDED to these routes,
  // so the design contract must define a frame for each.
  assert.match(source, /key: 'manualReview'/);
  assert.match(source, /route: '\/\(safety\)\/manual-review'/);
  assert.match(source, /key: 'suspended'/);
  assert.match(source, /route: '\/\(auth\)\/suspended'/);
});

test('local Figma plugin builds the terminal-state frames matching the contract', async () => {
  const plugin = await read('figma/code.js');
  // Frame names mirror FIGMA_FRAME_SPECS so design output maps to the contract.
  assert.match(plugin, /Bip \/ Safety \/ Manual Review \/ Night/);
  assert.match(plugin, /Bip \/ Auth \/ Suspended \/ Night/);
  assert.match(plugin, /\/\(safety\)\/manual-review/);
  assert.match(plugin, /\/\(auth\)\/suspended/);
  assert.match(plugin, /buildVerifyFrame/);
});

test('design system documents privacy boundaries', async () => {
  const source = await read('docs/FIGMA_SCREEN_SYSTEM.md');
  assert.match(source, /No open stranger DMs/);
  assert.match(source, /Public Circle identity never falls back to real account identity/);
  assert.match(source, /Parents never receive journal text/);
});
