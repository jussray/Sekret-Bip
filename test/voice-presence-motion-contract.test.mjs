import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const avatar = fs.readFileSync('components/PresenceAvatar.tsx', 'utf8');
const voiceRoom = fs.readFileSync('screens/VoiceBipScreen.tsx', 'utf8');
const reducedMotionHook = fs.readFileSync('hooks/useReducedMotion.ts', 'utf8');
const motionContract = fs.readFileSync('src/motion/presenceMotion.ts', 'utf8');

test('Voice Bip presence follows the live platform reduced-motion preference', () => {
  assert.match(reducedMotionHook, /AccessibilityInfo\.isReduceMotionEnabled\(\)/);
  assert.match(reducedMotionHook, /reduceMotionChanged/);
  assert.match(avatar, /const shouldAnimate = animate && !reduceMotion/);
  assert.match(avatar, /if \(!shouldAnimate\)/);
  assert.match(voiceRoom, /const reduceMotion = useReducedMotion\(\)/);
  assert.match(voiceRoom, /if \(reduceMotion\) return undefined/);
});

test('Voice Bip presence motion uses one shared timing and range authority', () => {
  assert.match(motionContract, /stateCrossfadeMs:\s*420/);
  assert.match(motionContract, /cloudFloatDurationMs:\s*3600/);
  assert.match(motionContract, /cloudBreathDurationMs:\s*2200/);
  assert.match(motionContract, /pillBreathDurationMs:\s*1800/);
  assert.match(avatar, /PRESENCE_MOTION\.stateCrossfadeMs/);
  assert.match(voiceRoom, /PRESENCE_MOTION\.cloudFloatDurationMs/);
  assert.match(voiceRoom, /PRESENCE_MOTION\.cloudBreathDurationMs/);
  assert.match(voiceRoom, /PRESENCE_MOTION\.pillBreathDurationMs/);
  assert.doesNotMatch(avatar, /duration:\s*420/);
  assert.doesNotMatch(voiceRoom, /duration:\s*3600/);
  assert.doesNotMatch(voiceRoom, /duration:\s*2200/);
  assert.doesNotMatch(voiceRoom, /duration:\s*1800/);
});

test('Voice Bip exposes avatar, Cloud, and presence pill for real browser motion proof', () => {
  assert.match(avatar, /testID="voice-presence-avatar"/);
  assert.match(avatar, /testID="voice-presence-avatar-live"/);
  assert.match(voiceRoom, /testID="voice-presence-cloud"/);
  assert.match(voiceRoom, /testID="voice-presence-pill"/);
});