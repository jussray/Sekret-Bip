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
  const out = mkdtempSync(path.join(tmpdir(), 'sekret-aitell-'));
  execFileSync(tsc, [
    path.resolve('services/sekretPresence.ts'),
    path.resolve('services/sekretVoice.ts'),
    '--rootDir', path.resolve('.'),
    '--outDir', out,
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--skipLibCheck',
  ], { stdio: 'inherit', cwd: out });
  return { voice: require(path.join(out, 'services', 'sekretVoice.js')), out };
}

const { voice, out } = loadVoice();
test.after(() => rmSync(out, { recursive: true, force: true }));

const BLOCKED_SAMPLES = [
  'Great question, let me think.',
  "You're absolutely right about that.",
  "That's a great point.",
  'What an insightful take.',
  'Thank you for sharing that with me.',
  "Let's explore that together.",
  'Without further ado, here it is.',
  "Now let's turn to the next part.",
  'That marks a shift in everything.',
  'The future looks bright for you.',
  'Exciting times lie ahead.',
  "It's a big step in the right direction.",
  'Your progress continues to thrive.',
  'This journey toward excellence matters.',
  'We showcase the best parts.',
  'Such a vibrant energy today.',
  'The intricate details matter.',
  'You garner respect everywhere.',
  'Fostering trust takes time.',
  'The interplay of choices is real.',
  'A renowned artist once said.',
  'Nestled in the valley sits a town.',
  'In the heart of the city.',
  'Highlighting that you tried matters.',
  'Underscoring the effort you made.',
  'Symbolizing growth, you moved on.',
  'Cultivating a deeper patience helps.',
  'Encompassing all of it takes time.',
  'At this point in time, rest.',
  'In the event that it rains, stay in.',
  'She has the ability to win.',
  'It could potentially possibly work.',
  'It might possibly happen.',
  'It could be argued that rest helps.',
  'One could argue otherwise.',
];

test('AI-tell patterns ported from PR #469 block companion replies', () => {
  for (const s of BLOCKED_SAMPLES) {
    assert.deepEqual(voice.guardSekretReply(s, 'FALLBACK'), { reply: 'FALLBACK', blocked: true }, s);
  }
});

test('ordinary companion voice still passes the guard', () => {
  for (const s of [
    'Still here. No rush.',
    'Aight, say the real version. What is going on?',
    'That sounds heavy for real. What part is hitting hardest?',
  ]) {
    assert.equal(voice.guardSekretReply(s, 'FALLBACK').blocked, false, s);
  }
});
