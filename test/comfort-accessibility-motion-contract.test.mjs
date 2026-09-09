import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const comfort = await read('screens/ComfortScreen.tsx');
const comfortMotion = await read('src/motion/comfortMotion.ts');
const route = await read('app/(teen)/comfort.tsx');
const api = await read('src/utils/api.ts');

test('Comfort keeps compatibility IDs behind canonical visible names', () => {
  assert.match(comfort, /normalizeSekretCharacter\(selectedSekret\)/);
  assert.match(comfort, /getVisibleSekretName\(characterId\)/);
  assert.match(comfort, /\{characterName\} says/);
  assert.doesNotMatch(comfort, /charLabel = isRylane \? 'rylane' : 'raylene'/);
  assert.doesNotMatch(comfort, /Raylene \(soft\)|Rylane \(loyal\)/);

  assert.match(api, /raw === 'suhana' \|\| raw === 'raylene'/);
  assert.match(api, /raw === 'sy' \|\| raw === 'rylane'/);
  assert.match(api, /suhana: 'Suhana'/);
  assert.match(api, /sy: 'Sy'/);
});

test('Comfort completion is emitted only from an explicit exit action', () => {
  assert.doesNotMatch(comfort, /useEffect\(\(\) => \{\s*onComplete\?\.\(\);/s);
  assert.match(comfort, /const finishComfort = \(target: string\) => \{/);
  assert.match(comfort, /if \(!completedRef\.current\) \{/);
  assert.match(comfort, /onComplete\?\.\(\)/);
  assert.match(comfort, /onPress=\{\(\) => finishComfort\('calm'\)\}/);
  assert.match(comfort, /onPress=\{\(\) => finishComfort\('home'\)\}/);
  assert.match(route, /onComplete=\{\(\) => emitEvent\('comfort_completed'\)\}/);
  assert.doesNotMatch(comfort, /feeling a little better|I'm good now/i);
});

test('Comfort copy offers optional grounding without absolute safety claims', () => {
  assert.match(comfort, /These optional steps can help you pause and notice what is around you/);
  assert.match(comfort, /Choose what you want to do next/);
  assert.doesNotMatch(comfort, /This is a safe space|private space|Nothing here is shared/i);
  assert.doesNotMatch(comfort, /resolved|recovered|cured|healthy now/i);
});

test('Grounding controls expose checked state, labels, and bounded touch targets', () => {
  assert.match(comfort, /testID=\{`comfort-step-\$\{step\.id\}`\}/);
  assert.match(comfort, /accessibilityRole="checkbox"/);
  assert.match(comfort, /accessibilityState=\{\{ checked: done \}\}/);
  assert.match(comfort, /accessibilityLabel=\{`\$\{step\.text\}/);
  assert.match(comfort, /minHeight: 48/);
  assert.match(comfort, /accessibilityLabel="Show another grounding thought"/);
  assert.match(comfort, /accessibilityLabel="Open Calm Space and finish this Comfort visit"/);
  assert.match(comfort, /accessibilityLabel="Finish this Comfort visit and return home"/);
});

test('Comfort uses one shared semantic motion contract', () => {
  assert.match(comfort, /COMFORT_MOTION/);
  assert.match(comfort, /cloudFloatDurationMs/);
  assert.match(comfort, /cloudBreathDurationMs/);
  assert.match(comfort, /presenceBreathDurationMs/);
  assert.match(comfort, /cloudRotationIntervalMs/);
  assert.match(comfortMotion, /cloudTranslateY: \[-6, 6\]/);
  assert.match(comfortMotion, /cloudScale: \[1, 1\.04\]/);
  assert.match(comfortMotion, /presenceScale: \[1, 1\.03\]/);
  assert.doesNotMatch(comfort, /duration: 3800|duration: 2400|duration: 1800/);
});

test('Comfort honors reduced motion and cleans every local animation resource', () => {
  assert.match(comfort, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(comfort, /reduceMotionChanged/);
  assert.match(comfort, /subscription\.remove\(\)/);
  assert.match(comfort, /if \(reduceMotion\) \{/);
  assert.match(comfort, /loops\.forEach\(loop => loop\.stop\(\)\)/);
  assert.match(comfort, /timers\.forEach\(timer => clearTimeout\(timer\)\)/);
  assert.match(comfort, /rainDrops\.forEach\(drop => drop\.anim\.stopAnimation\(\)\)/);
  assert.match(comfort, /clearInterval\(interval\)/);
  assert.match(comfort, /cloudFadeAnim\.stopAnimation\(\)/);
  assert.match(comfort, /!reduceMotion && rainDrops\.map/);
});

test('Comfort route remains thin and telemetry contains no private content', () => {
  assert.match(route, /import \{ ComfortScreen \} from '@screens\/ComfortScreen'/);
  assert.match(route, /emitEvent\('comfort_completed'\)/);
  assert.doesNotMatch(route, /input|message|thought|content:/i);
  assert.doesNotMatch(route, /AsyncStorage|cloud_thoughts|src\/lib\/supabase/);
  assert.doesNotMatch(comfort, /console\.(?:log|warn|error)/);
});