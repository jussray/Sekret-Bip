import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// Preserve the existing character art. Animate a single approved avatar,
// never overlay a second Cloud on the composite welcome family image.
const avatar = fs.readFileSync('components/PresenceAvatar.tsx', 'utf8');
const motion = fs.readFileSync('src/motion/presenceMotion.ts', 'utf8');

test('Cloud presence uses its own gentle floating motion', () => {
  assert.match(avatar, /const isCloud = character === 'cloud'/);
  assert.match(avatar, /PRESENCE_MOTION\.cloudFloatDurationMs/);
  assert.match(avatar, /PRESENCE_MOTION\.cloudTranslateX/);
  assert.match(avatar, /PRESENCE_MOTION\.cloudTranslateY/);
  assert.match(avatar, /translateX: isCloud && shouldAnimate \? cloudOffsetX : 0/);
  assert.match(avatar, /translateY: isCloud && shouldAnimate \? cloudOffsetY : 0/);
  assert.match(motion, /cloudTranslateX:\s*\[-6, 6\]/);
  assert.match(motion, /cloudTranslateY:\s*\[-3, 3\]/);
});

test('Cloud motion honors reduced motion and does not add duplicate images', () => {
  assert.match(avatar, /const shouldAnimate = animate && !reduceMotion/);
  assert.match(avatar, /if \(!shouldAnimate\) return undefined/);
  assert.match(avatar, /translateX: isCloud && shouldAnimate \? cloudOffsetX : 0/);
  assert.match(avatar, /translateY: isCloud && shouldAnimate \? cloudOffsetY : 0/);
  assert.equal((avatar.match(/<Animated\.Image/g) ?? []).length, 2,
    'Keep only existing current/previous crossfade layers, never a second Cloud');
  assert.match(avatar, /source=\{asset\}/);
});
