import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const src = fs.readFileSync('screens/WebWelcomeScreen.tsx', 'utf8');
const theme = fs.readFileSync('constants/frontDoorTheme.ts', 'utf8');
test('both teen and Bip Jr artwork appear simultaneously but flows stay separate', () => {
  assert.match(src,/web-welcome-both-worlds-on-screen/);
  assert.match(src,/web-welcome-cross-world-cameo/);
  assert.match(src,/source=\{isBipJr \? TEEN_HERO : BIP_JR_HERO\}/);
  assert.match(src,/testID="web-welcome-jr-entry"/);
  assert.match(src,/onPress=\{\(\) => onEnter\('parent'\)\}/);
  assert.match(src,/onPress=\{\(\) => onEnter\(entrySide\)\}/);
  assert.match(src,/web-welcome-audience-switch/);
});
test('green diagonal ripple preserves reduced-motion contracts and existing art', () => {
  assert.match(src,/web-welcome-diagonal-emerald-ripples/);
  assert.match(src,/FRONT_DOOR_THEME.gradient.diagonalRipple/);
  assert.match(src,/transform: \[\{ rotate: '-22deg' \}\]/);
  assert.match(src,/const motionEnabled = reduceMotion === false/);
  assert.match(theme,/mintLight/);
  assert.match(theme,/diagonalRipple/);
  assert.match(src,/sekret-bip-teen-family-v1.jpg/);
  assert.match(src,/parent-space-splash.png/);
});
