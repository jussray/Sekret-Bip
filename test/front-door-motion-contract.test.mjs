import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(new URL('../screens/WebWelcomeScreen.tsx', import.meta.url), 'utf8');
const arrival = fs.readFileSync(new URL('../src/components/FrontDoorSceneArrival.tsx', import.meta.url), 'utf8');
const entrypoint = fs.readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
const contract = fs.readFileSync(new URL('../src/motion/frontDoorMotion.ts', import.meta.url), 'utf8');
const prototype = fs.readFileSync(new URL('../prototypes/teen-welcome/index.html', import.meta.url), 'utf8');

test('web welcome uses the shared front-door motion contract', () => {
  assert.match(screen, /FRONT_DOOR_MOTION/);
  assert.match(screen, /pulseDurationMs/);
  assert.match(screen, /driftDurationMs/);
  assert.match(screen, /reducedPulseRestValue/);
  assert.match(contract, /ambientOpacity/);
  assert.match(contract, /heroTranslateY/);
  assert.match(contract, /sparkRotate/);
});

test('canonical teen front door blocks the full family into the final photo before ambient motion continues', () => {
  assert.match(entrypoint, /FrontDoorSceneArrival/);
  assert.match(entrypoint, /<FrontDoorSceneArrival>/);
  assert.match(arrival, /web-welcome-scene-arrival/);
  assert.match(arrival, /web-welcome-scene-settled/);
  assert.match(arrival, /web-welcome-photo-blocking/);
  assert.match(arrival, /web-welcome-stage-parents/);
  assert.match(arrival, /web-welcome-stage-night/);
  assert.match(arrival, /web-welcome-stage-suhana/);
  assert.match(arrival, /web-welcome-stage-sy/);
  assert.match(arrival, /web-welcome-stage-cloud/);
  assert.match(arrival, /TEEN_FAMILY_HERO/);
  assert.match(arrival, /NIGHT_HERO/);
  assert.match(arrival, /SUHANA_HERO/);
  assert.match(arrival, /SY_HERO/);
  assert.match(arrival, /CLOUD_HERO/);
  assert.match(arrival, /photoBlockingDurationMs/);
  assert.match(contract, /photoBlockingDurationMs: 1800/);
});

test('welcome motion is character blocking, not a screen-wide primer or visible name strip', () => {
  assert.doesNotMatch(arrival, /web-welcome-caveman-visual/);
  assert.doesNotMatch(arrival, /YOUR SPACE/);
  assert.doesNotMatch(arrival, /styles\.primer/);
  assert.doesNotMatch(prototype, /class="character-caption"/);
  assert.doesNotMatch(prototype, />Night<\/span>/);
  assert.doesNotMatch(prototype, />Suhana<\/span>/);
  assert.doesNotMatch(prototype, />Sy<\/span>/);
});

test('character entrances are staggered and converge before the final composite is revealed', () => {
  assert.match(arrival, /outputRange: \[-82, -82, 0, 0\]/);
  assert.match(arrival, /outputRange: \[-118, -118, 0, 0\]/);
  assert.match(arrival, /outputRange: \[118, 118, 0, 0\]/);
  assert.match(arrival, /outputRange: \[76, 76, 0, 0\]/);
  assert.match(arrival, /outputRange: \[92, 92, 0, 0\]/);
  assert.match(arrival, /inputRange: \[0, 0\.74, 1\]/);
  assert.match(arrival, /outputRange: \[1, 1, 0\]/);
});

test('reduced motion fails safe to the finished photo without staging', () => {
  assert.match(screen, /const motionEnabled = reduceMotion === false/);
  assert.match(screen, /isReduceMotionEnabled\(\)/);
  assert.match(screen, /setReduceMotion\(true\)/);
  assert.match(arrival, /prefersReducedMotionOnFirstFrame/);
  assert.match(arrival, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(arrival, /progress\.setValue\(1\)/);
  assert.match(arrival, /setArrivalState\('reduced'\)/);
  assert.match(arrival, /const stagingVisible = !reduceMotion/);
});
