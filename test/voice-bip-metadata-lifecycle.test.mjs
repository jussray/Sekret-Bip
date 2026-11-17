import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

// Regression guard for issue #667: VoiceBipScreen already called the canonical
// fetchSekretVoice() route, but dropped the provider/model/timing metadata it
// returns and never unloaded the Audio.Sound it created for playback.

test('VoiceBipScreen stores voice provider/timing metadata separately from the audio URI', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  assert.match(source, /const \[replyVoiceMeta,\s*setReplyVoiceMeta\]\s*=\s*useState/);
  assert.match(source, /const audio = await fetchSekretVoice\(/);
  assert.match(source, /const \{ audioBase64, contentType, characterId, \.\.\.meta \} = audio/);
  assert.match(source, /setReplyVoiceMeta\(meta\)/);

  // Reset points: a stale reply's metadata must not leak into the next one.
  assert.match(source, /setReplyAudioUri\(''\);\s*\n\s*setReplyVoiceMeta\(null\);/);
});

test('VoiceBipScreen never logs voice metadata, timing or otherwise', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  // timing.characters carries the literal spoken reply text once a caller
  // requests includeTiming (AGENTS.md: no private user content in logs).
  // A Bearer + Codex review finding both flagged a __DEV__ console.log of
  // this metadata (even after reducing it to non-content fields, Bearer kept
  // flagging the call site) — removed entirely rather than re-redacted again,
  // since logging it was never required by #667, only storing it in state.
  assert.doesNotMatch(source, /console\.log\('\[VoiceBipScreen\] voice metadata'/);
});

test('VoiceBipScreen unloads the reply Audio.Sound instead of leaking playback instances', () => {
  const source = read('screens/VoiceBipScreen.tsx');

  assert.match(source, /const replySoundRef\s*=\s*useRef<Audio\.Sound \| null>\(null\)/);

  // playReplyAudio unloads any prior sound before creating a new one.
  assert.match(
    source,
    /const playReplyAudio = async \(\) => \{[\s\S]*?prior\.unloadAsync\(\)[\s\S]*?Audio\.Sound\.createAsync/,
  );
  // ...and unloads itself once playback finishes.
  assert.match(source, /didJustFinish[\s\S]*?sound\.unloadAsync\(\)/);

  // Two overlapping taps can both pass the "no prior sound" check before
  // either finishes createAsync (it decodes a data URI, which isn't instant).
  // Whichever call's Sound loses the race for the ref must unload itself
  // instead of leaking.
  assert.match(
    source,
    /const \{ sound \} = await Audio\.Sound\.createAsync\(\{ uri: replyAudioUri \}\);\s*\n\s*if \(replySoundRef\.current\) \{[\s\S]*?sound\.unloadAsync\(\)[\s\S]*?return;\s*\n\s*\}/,
  );

  // Unmount cleanup also unloads any sound left playing.
  assert.match(
    source,
    /recordingRef\.current\?\.stopAndUnloadAsync\(\)\.catch\(\(\) => null\);\s*\n\s*replySoundRef\.current\?\.unloadAsync\(\)\.catch\(\(\) => null\);/,
  );

  // A newer tap's teardown can unload this exact sound while its own
  // playAsync() is still in flight, rejecting that promise. Nothing catches
  // the awaited call in the async press handler, so an uncaught rejection
  // must not be possible here.
  assert.match(source, /await sound\.playAsync\(\)\.catch\(\(\) => null\);/);
});

test('the canonical voice contract already carries provider, model, and timing metadata (residual-zero check)', () => {
  const contract = read('src/contracts/sekretApi.ts');
  const api = read('src/utils/api.ts');

  assert.match(contract, /requiresPreciseLipSync\?:\s*boolean/);
  assert.match(contract, /includeTiming\?:\s*boolean/);
  assert.match(contract, /timing\?:\s*CharacterAlignment/);

  assert.match(api, /voiceProvider: result\.data\.voiceProvider/);
  assert.match(api, /timing: result\.data\.timing/);
});
