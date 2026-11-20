import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('launch voice policy keeps paid STT and server TTS opt-in', () => {
  const api = read('src/utils/api.ts');

  assert.match(api, /EXPO_PUBLIC_VOICE_STT_ENABLED\s*===\s*'true'/);
  assert.match(api, /EXPO_PUBLIC_VOICE_TTS_ENABLED\s*===\s*'true'/);
  assert.match(api, /if \(!PAID_STT_ENABLED\) return null;/);
  assert.match(api, /if \(!PAID_TTS_ENABLED\) \{\s*await speakDeviceReply\(input\.reply, input\.characterId\);\s*return null;\s*\}/s);
});

test('untranscribed Voice Bip does not spend a companion reply call', () => {
  const api = read('src/utils/api.ts');

  assert.match(api, /const isUntranscribedVoiceBip =/);
  assert.match(api, /!PAID_STT_ENABLED/);
  assert.match(api, /surface === 'voiceBip'/);
  assert.match(api, /return localVoiceAck\(avatarKey\);/);
});

test('legacy API wrapper cannot fork the launch voice policy', () => {
  const legacyApi = read('utils/api.ts');

  assert.match(legacyApi, /export \* from '\.\.\/src\/utils\/api';/);
  assert.doesNotMatch(legacyApi, /PAID_STT_ENABLED/);
  assert.doesNotMatch(legacyApi, /PAID_TTS_ENABLED/);
  assert.doesNotMatch(legacyApi, /speakDeviceReply/);
});

test('standalone builds declare the Expo speech dependency', () => {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));

  assert.equal(pkg.dependencies?.['expo-speech'], '~56.0.3');
  assert.equal(lock.packages?.['']?.dependencies?.['expo-speech'], '~56.0.3');
  assert.equal(lock.packages?.['node_modules/expo-speech']?.version, '56.0.3');
});
