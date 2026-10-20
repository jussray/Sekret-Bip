import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const calm = fs.readFileSync('screens/CalmScreen.tsx', 'utf8');
const theme = fs.readFileSync('constants/theme.base.ts', 'utf8');
const reducedMotionHook = fs.readFileSync('hooks/useReducedMotion.ts', 'utf8');

test('Calm preserves legacy companion ids while presenting all four canonical identities', () => {
  assert.match(calm, /normalizeCharacterKey\(selectedSekret\)/);
  assert.match(calm, /raylene:\s*\{ label: 'Suhana', emoji: '💜' \}/);
  assert.match(calm, /rylane:\s*\{ label: 'Sy', emoji: '⚡' \}/);
  assert.match(calm, /cloud:\s*\{ label: 'Cloud', emoji: '☁️' \}/);
  assert.match(calm, /night:\s*\{ label: 'Night', emoji: '🌙' \}/);
  assert.match(theme, /if \(key === "cloud"\)\s+return "cloud"/);
  assert.match(theme, /if \(key === "night"\)\s+return "night"/);
  assert.doesNotMatch(calm, /const character\s*=\s*isRylane \? 'rylane' : 'raylene'/);
});

test('Calm uses the shared platform reduced-motion authority for ambient motion', () => {
  assert.match(reducedMotionHook, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(reducedMotionHook, /reduceMotionChanged/);
  assert.match(calm, /const reduceMotion = useReducedMotion\(\)/);
  assert.match(calm, /breatheAnim\.stopAnimation\(\)/);
  assert.match(calm, /pillBreath\.stopAnimation\(\)/);
  assert.match(calm, /value\.setValue\(reduceMotion \? 1 : 0\)/);
  assert.ok((calm.match(/if \(reduceMotion\) return undefined/g) ?? []).length >= 3);
});

test('Calm exposes decisive browser targets for identity and reduced-motion proof', () => {
  assert.match(calm, /testID="calm-presence-pill"/);
  assert.match(calm, /testID="calm-greeting-card"/);
  assert.match(calm, /testID="calm-breathe-pulse"/);
});
