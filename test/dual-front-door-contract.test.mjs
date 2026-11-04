import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const welcome = readFileSync('screens/WebWelcomeScreen.tsx', 'utf8');
const theme = readFileSync('constants/frontDoorTheme.ts', 'utf8');
const index = readFileSync('app/index.tsx', 'utf8');

test('front door presents one audience world at a time', () => {
  assert.match(welcome, /type WelcomeAudience = 'teen' \| 'bip-jr'/);
  assert.match(welcome, /web-welcome-hero-teen/);
  assert.match(welcome, /web-welcome-hero-bip-jr/);
  assert.match(welcome, /web-welcome-audience-switch/);
  assert.match(welcome, /setActiveAudience\(copy\.nextAudience\)/);
  assert.doesNotMatch(welcome, /I'm Teen/);
  assert.doesNotMatch(welcome, /I’m a Parent \/ Guardian/);
});

test('welcome keeps the family artwork primary and character names accessibility-only', () => {
  assert.match(welcome, /TEEN_HERO = require\('\.\.\/assets\/brand\/sekret-bip-teen-family-v1\.jpg'\)/);
  assert.match(welcome, /Night on the left, Suhana in the center, Sy on the right, Cloud, and their parents together/);
  assert.doesNotMatch(welcome, />\s*Night\s*</);
  assert.doesNotMatch(welcome, />\s*Suhana\s*</);
  assert.doesNotMatch(welcome, />\s*Sy\s*</);
  assert.doesNotMatch(welcome, /Night · Suhana · Sy/);
});

test('teen and Bip Jr keep truthful audience-specific action copy', () => {
  assert.match(welcome, /YOUR PEOPLE\. YOUR PEACE\./);
  assert.match(welcome, /YOUR FAMILY\. YOUR SPACE\./);
  assert.match(welcome, /Enter Se’kret Bip/);
  assert.match(welcome, /Enter with a grown-up/);
  assert.match(welcome, /Bip Jr family welcome — continue to family setup/);
});

test('audience maps to existing account-side authority instead of adding another identity model', () => {
  assert.match(welcome, /return side === 'parent' \? 'bip-jr' : 'teen'/);
  assert.match(welcome, /return audience === 'bip-jr' \? 'parent' : 'teen'/);
  assert.match(index, /<WebWelcomeScreen/);
  assert.match(index, /setSelectedEntrySide\(side\)/);
  assert.match(index, /setUserSide\(side\)/);
});

test('front-door theme keeps shared Bip atmosphere and safe-area contracts', () => {
  assert.match(theme, /heroSafeArea/);
  assert.match(theme, /teen:/);
  assert.match(theme, /bipJr:/);
  assert.match(theme, /ambientViolet/);
  assert.match(theme, /ambientPink/);
  assert.match(theme, /heroGlow/);
});
