import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const deviceSpeech = fs.readFileSync('utils/deviceSpeech.ts', 'utf8');

test('native device speech dependency is installed and locked for Expo SDK 58', () => {
  assert.equal(pkg.dependencies?.['expo-speech'], '~58.0.4');
  assert.equal(lock.packages?.['']?.dependencies?.['expo-speech'], '~58.0.4');

  const locked = lock.packages?.['node_modules/expo-speech'];
  assert.equal(locked?.version, '58.0.4');
  assert.equal(
    locked?.resolved,
    'https://registry.npmjs.org/expo-speech/-/expo-speech-58.0.4.tgz',
  );
  assert.equal(
    locked?.integrity,
    'sha512-AOwi6VkWfLh4OVUlK1bpvMqTgXHVMqcb+sqBu+mHfiCp4DZpsdDC7JGJEterXz7jdF9qPFwqwrtIarA2EaDHuQ==',
  );
});

test('device speech continues to bind the ExpoSpeech native module', () => {
  assert.match(deviceSpeech, /requireNativeModule\(['"]ExpoSpeech['"]\)/);
  assert.match(deviceSpeech, /nativeSpeech\.speak\(/);
});
