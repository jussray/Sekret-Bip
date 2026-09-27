import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('profile separates account identity from Circle identity', () => {
  const profile = read('app/(teen)/profile.tsx');
  assert.match(profile, /My Profile/);
  assert.match(profile, /Circle Identity/);
  assert.match(profile, /hydrateAccountProfile\('teen'\)/);
  assert.match(profile, /saveAccountProfile/);
  assert.match(profile, /teen_profile_data/);
  assert.match(profile, /teen_circle_identity/);
});

test('profile links growth and support to their owning spaces instead of duplicating them', () => {
  const profile = read('app/(teen)/profile.tsx');
  assert.match(profile, /Growth lives in Bippin 2/);
  assert.match(profile, /Support lives in Bridge/);
  assert.match(profile, /\/\(teen\)\/bippin2/);
  assert.match(profile, /\/\(teen\)\/bridge/);
});

test('Circle exposes a direct doorway to social identity', () => {
  const circle = read('app/(teen)/circle/index.tsx');
  assert.match(circle, /\/\(teen\)\/profile/);
  assert.match(circle, /Your Circle identity is separate from your private account/);
});

test('Circle identity copy preserves privacy boundaries', () => {
  const profile = read('app/(teen)/profile.tsx');
  assert.match(profile, /separate from your private account identity/);
  assert.match(profile, /Crew sees only what you choose to share/);
});

test('profile includes Memories as a safe scrapbook layer', () => {
  const profile = read('app/(teen)/profile.tsx');
  assert.match(profile, /Memories/);
  assert.match(profile, /Profile Memories/);
  assert.match(profile, /Every space creates memories/);
  assert.match(profile, /safe scrapbook markers/);
});

test('profile memories point back to owning spaces instead of exposing private content', () => {
  const profile = read('app/(teen)/profile.tsx');
  for (const route of [
    '/(teen)/pages',
    '/(teen)/circle',
    '/(teen)/bippin2',
    '/(teen)/calm',
    '/(teen)/room',
  ]) {
    assert.match(profile, new RegExp(route.replace(/[()]/g, '\\$&')));
  }
  assert.match(profile, /Pages protects the full story/);
  assert.match(profile, /Profile only remembers/);
});

test('parent profile mirrors durable identity, Circle identity, and support memories', () => {
  const profile = read('app/(parent)/profile.tsx');
  assert.match(profile, /My Profile/);
  assert.match(profile, /Circle Identity/);
  assert.match(profile, /Memories/);
  assert.match(profile, /Support Memories/);
  assert.match(profile, /hydrateAccountProfile\('parent'\)/);
  assert.match(profile, /saveAccountProfile/);
  assert.match(profile, /parent_circle_identity/);
});

test('parent memories are support markers, not teen surveillance', () => {
  const profile = read('app/(parent)/profile.tsx');
  assert.match(profile, /Profile collects safe markers of how you showed up/);
  assert.match(profile, /without opening teen private data/);
  assert.match(profile, /Parent Circle sees your community identity, not your teen’s private world/);
});

test('memories aliases point to Profile Hub on both sides', () => {
  const routes = read('src/shared/routes.ts');
  assert.match(routes, /memories:\s*PARENT_ROUTES\.profile/);
  assert.match(routes, /memories:\s*TEEN_ROUTES\.profile/);
});
