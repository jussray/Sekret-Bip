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

function loadVoice() {
  const out = mkdtempSync(path.join(tmpdir(), 'sekret-dash-'));
  execFileSync(tsc, [
    '--ignoreConfig',
    'services/sekretPresence.ts',
    'services/sekretVoice.ts',
    '--outDir', out,
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--skipLibCheck',
  ], { stdio: 'inherit' });
  return { voice: require(path.join(out, 'services', 'sekretVoice.js')), out };
}

const { voice, out } = loadVoice();
test.after(() => rmSync(out, { recursive: true, force: true }));

test('dashed companion replies are rewritten, not replaced with the canned fallback', () => {
  assert.equal(
    voice.keepSekretReply('Hey. No pressure — whatever you want to say.', 'FALLBACK'),
    'Hey. No pressure, whatever you want to say.',
  );
  assert.equal(voice.keepSekretReply('That tracks – you were tired.', 'FALLBACK'), 'That tracks, you were tired.');
  assert.equal(voice.keepSekretReply('Wait -- you did what?', 'FALLBACK'), 'Wait, you did what?');
  assert.equal(voice.keepSekretReply('Take 2–3 minutes.', 'FALLBACK'), 'Take 2-3 minutes.');
  assert.equal(voice.keepSekretReply('— okay, talk to me —', 'FALLBACK'), 'okay, talk to me');
});

test('no dash survives in a passed reply', () => {
  const r = voice.guardSekretReply('Real talk — you showed up. That counts – for real.', 'FALLBACK');
  assert.equal(r.blocked, false);
  assert.doesNotMatch(r.reply, /[—–]|\s--\s/);
});

test('blocked language split by a dash is still blocked', () => {
  for (const s of ["I'm here — to support you.", 'Delve into it — trust me.', 'How does that — make you feel']) {
    assert.deepEqual(voice.guardSekretReply(s, 'FALLBACK'), { reply: 'FALLBACK', blocked: true }, s);
  }
});

test('guard result reports blocked truthfully for empty and non-string replies', () => {
  assert.deepEqual(voice.guardSekretReply('', 'FALLBACK'), { reply: 'FALLBACK', blocked: true });
  assert.deepEqual(voice.guardSekretReply(undefined, 'FALLBACK'), { reply: 'FALLBACK', blocked: true });
  assert.deepEqual(voice.guardSekretReply('Still here. No rush.', 'FALLBACK'), { reply: 'Still here. No rush.', blocked: false });
});
