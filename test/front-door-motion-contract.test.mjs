import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(new URL('../screens/WebWelcomeScreen.tsx', import.meta.url), 'utf8');
const arrival = fs.readFileSync(new URL('../src/components/FrontDoorSceneArrival.tsx', import.meta.url), 'utf8');
const entrypoint = fs.readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
const contract = fs.readFileSync(new URL('../src/motion/frontDoorMotion.ts', import.meta.url), 'utf8');

test('web welcome uses the shared front-door motion contract', () => {
  assert.match(screen, /FRONT_DOOR_MOTION/);
  assert.match(screen, /pulseDurationMs/);
  assert.match(screen, /driftDurationMs/);
  assert.match(screen, /reducedPulseRestValue/);
  assert.match(contract, /ambientOpacity/);
  assert.match(contract, /heroTranslateY/);
  assert.match(contract, /sparkRotate/);
});

test('canonical front door arrives as one short scene before ambient motion continues', () => {
  assert.match(entrypoint, /FrontDoorSceneArrival/);
  assert.match(entrypoint, /<FrontDoorSceneArrival>/);
  assert.match(arrival, /web-welcome-scene-arrival/);
  assert.match(arrival, /web-welcome-scene-settled/);
  assert.match(arrival, /arrivalState !== 'entering'/);
  assert.match(arrival, /arrivalDurationMs/);
  assert.match(arrival, /arrivalOpacity/);
  assert.match(arrival, /arrivalTranslateY/);
  assert.match(arrival, /arrivalScale/);
  assert.match(contract, /arrivalDurationMs: 900/);
  assert.match(contract, /arrivalOpacity: \[0\.18, 1\]/);
  assert.match(contract, /arrivalTranslateY: \[28, 0\]/);
  assert.match(contract, /arrivalScale: \[0\.985, 1\]/);
});

test('caveman visual is three visual beats, not another floating explanation pill', () => {
  assert.match(arrival, /web-welcome-caveman-visual/);
  assert.match(arrival, /You\. Your space\. Enter\./);
  assert.match(arrival, />\s*◉\s*</);
  assert.match(arrival, />\s*YOU\s*</);
  assert.match(arrival, />\s*☾\s*</);
  assert.match(arrival, />\s*YOUR SPACE\s*</);
  assert.match(arrival, />\s*✦\s*</);
  assert.match(arrival, />\s*ENTER\s*</);
  assert.match(arrival, /styles\.primerCardStrong/);
  assert.match(arrival, /pointerEvents="none"/);
  assert.doesNotMatch(arrival, /borderRadius: RADIUS\.pill/);
});

test('visual beats reveal in order and clear before the settled interaction state', () => {
  assert.match(arrival, /inputRange: \[0, 0\.06, 0\.24, 0\.88, 1\]/);
  assert.match(arrival, /inputRange: \[0, 0\.18, 0\.36, 0\.88, 1\]/);
  assert.match(arrival, /inputRange: \[0, 0\.34, 0\.52, 0\.88, 1\]/);
  assert.match(arrival, /arrivalState === 'entering'/);
  assert.match(arrival, /arrivalState !== 'entering'/);
});

test('reduced motion fails safe before decorative or arrival motion starts', () => {
  assert.match(screen, /const motionEnabled = reduceMotion === false/);
  assert.match(screen, /isReduceMotionEnabled\(\)/);
  assert.match(screen, /setReduceMotion\(true\)/);
  assert.match(arrival, /prefersReducedMotionOnFirstFrame/);
  assert.match(arrival, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(arrival, /progress\.setValue\(1\)/);
  assert.match(arrival, /setArrivalState\('reduced'\)/);
  assert.match(arrival, /styles\.primerReduced/);
});

test('Teen and Bip Jr artwork reveal in sequence without replacing character art or running reduced motion', () => {
  for (const marker of [
    'web-welcome-copy-reveal',
    'web-welcome-hero-reveal',
    'web-welcome-world-cues',
    'Animated.stagger(',
    'activeAudience, audienceCopyReveal, audienceHeroReveal, audienceCuesReveal, motionEnabled',
    'values.forEach(value => value.setValue(1))',
    "const BIP_JR_HERO = require('../assets/images/parent-space-splash.png')",
    "const TEEN_HERO = require('../assets/brand/sekret-bip-teen-family-v1.jpg')",
  ]) {
    assert.ok(screen.includes(marker), `Missing original-art or reduced-motion guarantee: ${marker}`);
  }
  assert.ok(contract.includes('audienceRevealDurationMs: 640'));
  assert.ok(contract.includes('audienceRevealStaggerMs: 130'));
  assert.ok(contract.includes('audienceRevealTranslateY: [12, 0]'));
  assert.ok(contract.includes('audienceHeroScale: [0.985, 1]'));
});

test('welcome changes reset the reveal before paint and never expose empty slow-loading artwork', () => {
  assert.match(screen, /useLayoutEffect\(\(\) => \{/);
  assert.match(screen, /values\.forEach\(value => value\.setValue\(0\)\)/);
  assert.match(screen, /key=\{activeAudience\}/);
  assert.match(screen, /onLoadEnd=\{\(\) => setHeroLoadedFor\(activeAudience\)\}/);
  assert.match(screen, /heroLoadedFor !== activeAudience/);
  assert.match(screen, /setHeroLoadedFor\(null\)/);
  assert.match(screen, /Animated\.sequence\(\[/);
  assert.match(screen, /Animated\.stagger\(/);
});

test('Teen cues retain their quieter rest opacity with motion and reduced motion', () => {
  assert.match(screen, /TEEN_CUE_REST_OPACITY = 0\.62/);
  assert.match(screen, /opacity: TEEN_CUE_REST_OPACITY/);
  assert.match(screen, /outputRange: \[0, restOpacity\]/);
  assert.match(screen, /: restOpacity,/);
  assert.match(screen, /audienceRevealStyle\(audienceCuesReveal, isBipJr \? 1 : TEEN_CUE_REST_OPACITY\)/);
});
