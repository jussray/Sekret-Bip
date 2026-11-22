/**
 * #415: journal mild/moderate safety tiers must produce a supportive nudge
 * WITHOUT interrupting writing — previously every tier, including mild,
 * triggered the same full-screen blocking SafetyExperienceSheet modal.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const coordinator = read('src/features/safety/safetyCoordinator.ts');
const sheet = read('components/safety/SafetyExperienceSheet.tsx');
const nudge = read('components/safety/JournalSafetyNudge.tsx');
const pagesScreen = read('app/(teen)/pages/index.tsx');

test('TIER_META has one source of truth, shared by the sheet and the nudge', () => {
  assert.match(coordinator, /export const TIER_META: Record<SafetyTier/);
  assert.match(sheet, /import \{\s*\n\s*acknowledgeAlert,\s*\n\s*TIER_META,/);
  assert.doesNotMatch(sheet, /const TIER_META = \{/);
  assert.match(nudge, /TIER_META,/);
});

test('JournalSafetyNudge never carries crisis resources or renders as a blocking modal', () => {
  assert.doesNotMatch(nudge, /CrisisResource|resources\.(map|length)/);
  assert.doesNotMatch(nudge, /<Modal/);
});

test('JournalSafetyNudge is removed from layout flow (position: absolute), so it cannot displace or cover the compose area', () => {
  const styleStart = nudge.indexOf('card: {');
  const styleEnd = nudge.indexOf('},', styleStart);
  const cardStyle = nudge.slice(styleStart, styleEnd);
  assert.match(cardStyle, /position: 'absolute'/);
});

test('JournalSafetyNudge acknowledges the alert the same privacy-safe, local-only way the sheet does', () => {
  assert.match(nudge, /acknowledgeAlert\(alertId\)\.catch\(\(\) => \{\}\)/);
});

test('reduced motion skips the fade-in animation', () => {
  const effectStart = nudge.indexOf('useEffect(() => {\n    if (reduceMotion)');
  const effectEnd = nudge.indexOf('}, [reduceMotion', effectStart);
  const effectBody = nudge.slice(effectStart, effectEnd);
  assert.match(effectBody, /if \(reduceMotion\) \{\s*\n\s*fade\.setValue\(1\);\s*\n\s*return;/);
});

test('the journal screen routes immediate_danger to the blocking sheet and every other tier to the non-blocking nudge', () => {
  assert.match(
    pagesScreen,
    /safetyExperience\?\.tier === 'immediate_danger' \? \(\s*\n\s*<SafetyExperienceSheet/,
  );
  assert.match(pagesScreen, /\) : safetyExperience \? \(\s*\n\s*<JournalSafetyNudge/);
});
