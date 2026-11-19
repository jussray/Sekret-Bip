import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const callsites = ["hooks/useAudioPlayer.ts","hooks/useVoiceRecorder.ts","services/audio/audioPlayback.ts","components/audio/RecordingPermissionGate.tsx","screens/VoiceBipScreen.tsx","screens/PagesScreen.tsx","app/(teen)/pages/index.tsx","app/(teen)/pages/[id].tsx"];

test('SDK 58 runtime has no expo-av callsites', () => {
  for (const file of callsites) {
    assert.doesNotMatch(read(file), /from ['"]expo-av['"]/);
    assert.doesNotMatch(read(file), /Audio\.Sound\.createAsync|Audio\.Recording\.createAsync/);
  }
});
test('Voice Bip recorder uses native audio lifecycle and preserves private URI', () => {
  const screen = read('screens/VoiceBipScreen.tsx');
  const recorder = read('hooks/useVoiceRecorder.ts');
  assert.match(screen, /useAudioRecorder\(RecordingPresets\.HIGH_QUALITY\)/);
  assert.match(screen, /await audioRecorder\.prepareToRecordAsync\(\)/);
  assert.match(screen, /audioRecorder\.record\(\)/);
  assert.match(screen, /await recording\.stop\(\)/);
  assert.match(screen, /const uri = recording\.uri/);
  assert.match(recorder, /await saveRecordingLocally\(uri\)/);
});
test('Voice reply data URI cleanup and journal video preview retain behavior', () => {
  const playback = read('services/audio/audioPlayback.ts');
  const screens = read('app/(teen)/pages/index.tsx');
  assert.match(playback, /FileSystem\.writeAsStringAsync/);
  assert.match(playback, /FileSystem\.deleteAsync/);
  assert.match(playback, /player\.release\(\)/);
  assert.match(screens, /useVideoPlayer\(uri\)/);
  assert.match(screens, /<VideoView player=\{player\}/);
});
