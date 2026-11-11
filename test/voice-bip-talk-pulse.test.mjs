/**
 * #667 follow-up: the typed timing request now actually reaches the Worker,
 * and the previously-unused `timing` metadata now drives a real consumer —
 * Cloud's talking pulse during reply playback — instead of sitting unread
 * in state. Source-pattern style, matching voice-bip-metadata-lifecycle.test.mjs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('VoiceBipScreen requests includeTiming so the typed option actually reaches the Worker', () => {
  const source = read('screens/VoiceBipScreen.tsx');
  assert.match(
    source,
    /fetchSekretVoice\(\{ reply, characterId: avatar\.personality, includeTiming: true \}\)/,
  );
});

test('talk pulses are scheduled from timing and respect reduced motion', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  assert.match(source, /const talkAnim\s*=\s*useRef\(new Animated\.Value\(1\)\)\.current/);
  assert.match(source, /const talkTimersRef\s*=\s*useRef<ReturnType<typeof setTimeout>\[\]>\(\[\]\)/);
  assert.match(source, /const MAX_TALK_PULSES = 60/);

  const fnStart = source.indexOf('const scheduleTalkPulses =');
  const fnEnd = source.indexOf('\n  };', fnStart);
  const fnBody = source.slice(fnStart, fnEnd);
  assert.match(fnBody, /clearTalkPulses\(\)/);
  assert.match(fnBody, /if \(reduceMotion\) return/);
  assert.match(fnBody, /timing\?\.characterStartTimesSeconds/);
  assert.match(fnBody, /\.slice\(0, MAX_TALK_PULSES\)/);
});

test('scheduleTalkPulses is called with the current reply metadata once this sound owns the ref', () => {
  const source = read('screens/VoiceBipScreen.tsx');
  assert.match(
    source,
    /replySoundRef\.current = sound;\s*\n\s*scheduleTalkPulses\(replyVoiceMeta\?\.timing\)/,
  );
});

test('talk pulses are cleared on natural finish, on being superseded, on new recording, and on unmount', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  // Natural finish.
  assert.match(
    source,
    /didJustFinish[\s\S]*?replySoundRef\.current = null;\s*\n\s*clearTalkPulses\(\);/,
  );
  // Unloading a prior sound before a new tap's sound takes over.
  assert.match(
    source,
    /replySoundRef\.current = null;\s*\n\s*clearTalkPulses\(\);\s*\n\s*await prior\.unloadAsync/,
  );
  // A fresh recording clears any pulses left over from the previous reply.
  assert.match(
    source,
    /setReplyVoiceMeta\(null\);\s*\n\s*talkTimersRef\.current\.forEach\(clearTimeout\);\s*\n\s*talkTimersRef\.current = \[\];\s*\n\s*talkAnim\.setValue\(1\);/,
  );
  // Unmount.
  assert.match(
    source,
    /replySoundRef\.current\?\.unloadAsync\(\)\.catch\(\(\) => null\);\s*\n\s*talkTimersRef\.current\.forEach\(clearTimeout\);/,
  );
});

test('the talk pulse only renders on the motion-enabled Cloud transform, not the reduced-motion one', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  const reducedBlockStart = source.indexOf('const cloudStyle = reduceMotion ? {');
  const elseIdx = source.indexOf('} : {', reducedBlockStart);
  const fullBlockEnd = source.indexOf('\n  };', elseIdx);
  const reducedBranch = source.slice(reducedBlockStart, elseIdx);
  const motionBranch = source.slice(elseIdx, fullBlockEnd);

  assert.doesNotMatch(reducedBranch, /talkAnim/);
  assert.match(motionBranch, /\{ scale: talkAnim \}/);
});
