import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('teen sync, local storage, and audit failures never print raw provider error objects', () => {
  const sync = read('src/utils/sync.ts');
  assert.doesNotMatch(sync, /console\.warn\([^\n]*(?:error\.message|error\.code|, e\)|res\.value\.error\.message)/);
  assert.doesNotMatch(sync, /catch \(e\)/, 'discard caught errors rather than logging private content');
  const storage = read('src/utils/storage.ts');
  assert.doesNotMatch(storage, /console\.error\('[^']+ error:', error\)/);
  const audit = read('src/services/runtimeAudit.ts');
  assert.doesNotMatch(audit, /console\.warn\([^\n]*error\?\.message/);
  assert.doesNotMatch(audit, /console\.warn\([^\n]*e instanceof Error/);
});

test('Worker reply, transcription and health logs use bounded failure categories only', () => {
  const index = read('worker/index.ts');
  const reply = read('worker/sekret-reply.ts');
  const entry = read('worker/voice-entry.ts');
  assert.match(index, /SEKRET_RATE_LIMIT_UNAVAILABLE/);
  assert.match(index, /SEKRET_PIPER_SYNTHESIS_FAILED/);
  assert.match(reply, /SEKRET_REPLY_PROVIDER_FAILED/);
  assert.match(reply, /SEKRET_TRANSCRIPTION_FAILED/);
  assert.match(entry, /SEKRET_DELEGATED_HEALTH_INVALID/);
  assert.match(entry, /code: 'provider_failure'/);
  for (const content of [index, reply]) {
    assert.doesNotMatch(content, /console\.error\('\[(?:rate-limit|sekret\/reply|sekret\/transcribe|sekret\/voice:piper)\]', error\)/);
  }
  assert.doesNotMatch(entry, /error instanceof Error \? error\.message/);
});
