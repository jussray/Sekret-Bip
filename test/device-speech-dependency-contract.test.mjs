import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const deviceSpeech = fs.readFileSync('utils/deviceSpeech.ts', 'utf8');

test('native device speech dependency is installed and locked for Expo SDK 56', () => {
  assert.equal(pkg.dependencies?.['expo-speech'], '~56.0.3');
  assert.equal(lock.packages?.['']?.dependencies?.['expo-speech'], '~56.0.3');

  const locked = lock.packages?.['node_modules/expo-speech'];
  assert.equal(locked?.version, '56.0.3');
  assert.equal(
    locked?.resolved,
    'https://registry.npmjs.org/expo-speech/-/expo-speech-56.0.3.tgz',
  );
  assert.equal(
    locked?.integrity,
    'sha512-NkO7RX+BgJCALrjL/6C9AsyenkmJD9EBDIKAQmSN6BLrcXxwZnyQ9TSo/ZTSDSY9Y28aStXHfEBQogt2qUrP9w==',
  );
});

test('device speech continues to bind the ExpoSpeech native module', () => {
  assert.match(deviceSpeech, /requireNativeModule\(['"]ExpoSpeech['"]\)/);
  assert.match(deviceSpeech, /nativeSpeech\.speak\(/);
});
