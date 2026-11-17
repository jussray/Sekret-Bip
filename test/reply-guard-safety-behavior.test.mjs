import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const localTsc = path.resolve('node_modules/.bin/tsc');
const tsc = existsSync(localTsc) ? localTsc : 'tsc';
const out = mkdtempSync(path.join(tmpdir(), 'sekret-safety-'));

execFileSync(tsc, [
  path.resolve('services/sekretPresence.ts'),
  path.resolve('services/sekretVoice.ts'),
  path.resolve('services/sekretSafety.ts'),
  '--rootDir', path.resolve('.'),
  '--outDir', out,
  '--target', 'ES2020',
  '--module', 'commonjs',
  '--skipLibCheck',
], { stdio: 'inherit', cwd: out });

const voice = require(path.join(out, 'services', 'sekretVoice.js'));
const safety = require(path.join(out, 'services', 'sekretSafety.js'));
test.after(() => rmSync(out, { recursive: true, force: true }));

test('raw voice guard still blocks a safety reply containing blocked style language', () => {
  const reply = "I'm here for you. Please call or text 988.";
  assert.deepEqual(voice.guardSekretReply(reply, 'FALLBACK'), { reply: 'FALLBACK', blocked: true });
});

test('explicit safety flag bypasses the voice guard', () => {
  assert.deepEqual(
    safety.shouldBypassReplyGuard("I'm here for you. Please call or text 988.", true),
    { bypass: true, reason: 'safety-flag' },
  );
});

test('resource marker backstop bypasses when the upstream safety flag is missing', () => {
  assert.deepEqual(
    safety.shouldBypassReplyGuard("I'm here for you. Please call or text 988.", false),
    { bypass: true, reason: 'crisis-resource-backstop' },
  );
  assert.equal(safety.hasCrisisResourceMarker('Text HOME to 741741.'), true);
  assert.equal(safety.hasCrisisResourceMarker('Call 911 if there is immediate danger.'), true);
});

test('ordinary numeric mentions do not trip the crisis-resource backstop', () => {
  assert.equal(safety.hasCrisisResourceMarker('The Porsche 911 is a car.'), false);
  assert.equal(safety.hasCrisisResourceMarker('Turn to page 988.'), false);
});

test('local crisis fallback carries all three U.S. resource paths', () => {
  const fallback = safety.getLocalSafetyFallback('I am not safe here');
  assert.ok(fallback);
  assert.match(fallback, /911/);
  assert.match(fallback, /988/);
  assert.match(fallback, /741741/);
});

test('upstream fallback without crisis resources is replaced for high-risk input', () => {
  const result = safety.recoverSafetyResourcesFromUpstreamFallback(
    'I am not safe here',
    'Please contact a trusted adult or local emergency support.',
    'fallback',
  );
  assert.equal(result.substituted, true);
  assert.match(result.reply, /911/);
  assert.match(result.reply, /988/);
  assert.match(result.reply, /741741/);
});

test('upstream fallback recovery does not overwrite an already resource-bearing reply', () => {
  const reply = 'Tell a trusted adult and call or text 988.';
  assert.deepEqual(
    safety.recoverSafetyResourcesFromUpstreamFallback('I am not safe here', reply, 'fallback'),
    { reply, substituted: false },
  );
});

test('ordinary input does not activate the local safety fallback', () => {
  assert.equal(safety.getLocalSafetyFallback('this movie made me sad'), null);
  assert.equal(safety.getLocalSafetyFallback('I feel like dancing'), null);
  assert.deepEqual(
    safety.recoverSafetyResourcesFromUpstreamFallback('this movie made me sad', 'No rush.', 'fallback'),
    { reply: 'No rush.', substituted: false },
  );
});
