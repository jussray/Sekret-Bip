import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync('screens/CanonUniverseWelcome.tsx', 'utf8');
const welcome = readFileSync('screens/WebWelcomeScreen.tsx', 'utf8');
const index = readFileSync('app/index.tsx', 'utf8');

test('the approved universe art is a checked-in local image', () => {
  const path = 'assets/brand/sekret-bip-universe-canon.jpg';
  assert.ok(existsSync(path), 'approved image file must exist');
  assert.ok(statSync(path).size > 100_000);
  assert.match(screen, /sekret-bip-universe-canon\.jpg/);
  assert.match(welcome, /<CanonUniverseWelcome/);
});

test('three illustrated portals are real controls without a duplicate button row', () => {
  for (const name of ["'teens'", "'bip-jr'", "'parents'"]) assert.ok(screen.includes(name));
  assert.match(screen, /bip-universe-portal-\$\{portal\.id\}/);
  assert.match(screen, /styles\.portalHitArea/);
  assert.match(screen, /minHeight: 44/);
  assert.doesNotMatch(screen, /mobilePortalButton|bip-universe-mobile-choices/);
});

test('portal routing preserves real teen and parent authorization', () => {
  assert.match(screen, /id: 'teens', destination: 'teen'/);
  assert.match(screen, /id: 'bip-jr', destination: 'parent'/);
  assert.match(screen, /id: 'parents', destination: 'parent'/);
  assert.match(screen, /onPress=\{\(\) => onEnter\(portal\.destination\)\}/);
  assert.match(index, /fetchPostAuthBootstrap/);
});

test('change is scoped to public welcome; development rollback retains prior UI', () => {
  assert.match(welcome, /bipLegacyWelcome/);
  assert.match(welcome, /LegacyWebWelcomeScreen/);
  assert.match(welcome, /__DEV__/);
  assert.doesNotMatch(screen, /Lumora|Kaire|Sage/);
});
