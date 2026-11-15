import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Inflected abuse and assault wording must trigger crisis handling on every
// detector that guards a teen crisis path. The three detectors are:
//   - services/sekretSafety.ts        isCrisisInput (client fallback and reply guard)
//   - worker/sekret-reply.ts          CRISIS_RE (canned crisis reply on the worker)
//   - src/features/sekret/companionEngine.ts  CRISIS_PATTERN (isSafetyTrigger)
// They are checked on the same phrases so one list cannot drift from the others.

const require = createRequire(import.meta.url);
const localTsc = path.resolve('node_modules/.bin/tsc');
const tsc = existsSync(localTsc) ? localTsc : 'tsc';
const out = mkdtempSync(path.join(tmpdir(), 'sekret-crisis-inflection-'));
after(() => rmSync(out, { recursive: true, force: true }));

execFileSync(tsc, [
  path.resolve('services/sekretSafety.ts'),
  '--rootDir', path.resolve('.'),
  '--outDir', out,
  '--target', 'ES2020',
  '--module', 'commonjs',
  '--skipLibCheck',
], { stdio: 'inherit', cwd: out });

const safety = require(path.join(out, 'services', 'sekretSafety.js'));

// Reads the live regex literal from source, the same way worker-safety.test.mjs
// does, so the test exercises the shipped pattern rather than a copy of it.
function regexFromSource(file, declaration) {
  const source = readFileSync(path.resolve(file), 'utf8');
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `${file} must declare ${declaration}`);
  const from = source.indexOf('/', start + declaration.length);
  const end = source.indexOf(';', from);
  const literal = source.slice(from, end).trim();
  const match = literal.match(/^\/(.*)\/([a-z]*)$/s);
  assert.ok(match, `${file}: could not read the regex literal after ${declaration}`);
  return new RegExp(match[1], match[2]);
}

const workerCrisis = regexFromSource('worker/sekret-reply.ts', 'const CRISIS_RE =');
const companionCrisis = regexFromSource('src/features/sekret/companionEngine.ts', 'const CRISIS_PATTERN =');

const detectors = {
  'services/sekretSafety.ts isCrisisInput': (text) => safety.isCrisisInput(text),
  'worker/sekret-reply.ts CRISIS_RE': (text) => workerCrisis.test(text),
  'companionEngine.ts CRISIS_PATTERN': (text) => companionCrisis.test(text),
};

const CRISIS_PHRASES = [
  "he's abusing me",
  'someone is abusing me',
  'he abuses me',
  "I'm being abused",
  'I was assaulted last night',
  'she was assaulting me',
  'there was an assault',
  "I've been hurting myself again",
  'she was cutting myself at night',
  'he is self-harming again',
  'I am killing myself slowly',
];

const BENIGN_PHRASES = [
  'I love my dog',
  'my assignment is due Friday',
  'we talked about the weather',
];

for (const [name, detect] of Object.entries(detectors)) {
  for (const phrase of CRISIS_PHRASES) {
    test(`${name} detects ${JSON.stringify(phrase)}`, () => {
      assert.equal(detect(phrase), true);
    });
  }
  for (const phrase of BENIGN_PHRASES) {
    test(`${name} ignores ${JSON.stringify(phrase)}`, () => {
      assert.equal(detect(phrase), false);
    });
  }
}
