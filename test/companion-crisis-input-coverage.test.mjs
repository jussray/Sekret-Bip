import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const localTsc = path.resolve('node_modules/.bin/tsc');
const tsc = existsSync(localTsc) ? localTsc : 'tsc';
const out = mkdtempSync(path.join(tmpdir(), 'sekret-crisis-'));
test.after(() => rmSync(out, { recursive: true, force: true }));

execFileSync(tsc, [
  path.resolve('services/crisisPolicy.ts'),
  path.resolve('services/sekretSafety.ts'),
  '--rootDir', path.resolve('.'),
  '--outDir', out,
  '--target', 'ES2020',
  '--module', 'commonjs',
  '--skipLibCheck',
  '--strict',
], { stdio: 'inherit' });

const policy = require(path.join(out, 'services', 'crisisPolicy.js'));
const safety = require(path.join(out, 'services', 'sekretSafety.js'));

export const POSITIVES = [
  'i keep thinking about killing myself',
  'i have been cutting myself again',
  'i think about overdose a lot',
  'I wish I was dead.',
  'no reason to live',
  'Can’t go on anymore!!',
  "CAN'T GO ON ANYMORE",
  'cant go on anymore',
  'can t go on anymore',
  'can’t   go on, anymore',
  'wish i was dead...',
  'I wish I wasn’t alive',
  'wish i wasnt alive',
  'I dont want to be here anymore',
  'I don’t want to be here anymore',
  'dont want to be here any more',
  'no reason to keep living',
  'Self-harm again',
  'no point in living',
  'i dont want to live anymore',
  'I dont want to live in this world',
  'i dont want to live here anymore',
  'I don’t want to live',
  'I live in Lagos and I dont want to live anymore',
  'I want to live in Lagos, I wish I was dead',
  'I live near my mom but no reason to live',
  'I DON’T WANT TO LIVE',
];

export const NEGATIVES = [
  'im bored, nothing to do',
  'my cat knocked over the cup lol',
  'I want to live in Lagos',
  'I wish I was dead tired lol',
  'I can’t go on this ride',
  'I don’t want to be here at the party',
  'no reason to be late',
  'I’m dead tired',
  'no point in arguing with him',
  'dont want to go to school tomorrow',
  "I don't want to live in New York",
  'i dont want to live near my mom',
  "I don't want to live here, the town is boring",
];

test('tested set sizes are fixed', () => {
  assert.equal(POSITIVES.length, 27);
  assert.equal(NEGATIVES.length, 13);
});

test('positive variants are caught', () => {
  for (const text of POSITIVES) assert.equal(policy.isCrisisText(text), true, text);
});

test('contraction variants normalize consistently', () => {
  const variants = ["can't go on anymore", 'cant go on anymore', "can’t go on anymore", 'can t go on anymore', "CAN'T GO ON ANYMORE!"];
  for (const text of variants) assert.equal(policy.isCrisisText(text), true, text);
  assert.equal(policy.normalizeCrisisText("can’t go on anymore"), policy.normalizeCrisisText("cant go on anymore"));
  assert.equal(policy.normalizeCrisisText("don't want to live"), policy.normalizeCrisisText("dont want to live"));
});

test('negative controls are not flagged', () => {
  for (const text of NEGATIVES) assert.equal(policy.isCrisisText(text), false, text);
});

test('client safety delegates to the shared policy', () => {
  for (const text of POSITIVES) assert.equal(safety.isCrisisInput(text), true, text);
  for (const text of NEGATIVES) assert.equal(safety.isCrisisInput(text), false, text);
  assert.equal(safety.isCrisisInput(undefined), false);
  assert.equal(safety.isCrisisInput(42), false);
});

test('contextual danger wording does not escalate benign educational or fictional uses', () => {
  const safe = [
    'The game says run away from the monster',
    'We learned about abuse in class',
    'I am no longer in danger',
    'I am not in danger',
    'This chapter describes an emergency response',
    'A fictional character ran away',
  ];
  for (const text of safe) {
    assert.equal(policy.isCrisisText(text), false, text);
    assert.equal(safety.isCrisisInput(text), false, text);
  }
});

test('contextual current danger wording still activates shared safety rules', () => {
  const relevant = [
    'i am in danger',
    'i feel in danger',
    'i am being abused',
    'there was an assault',
    'this is an emergency',
    'i want to run away from home',
  ];
  for (const text of relevant) {
    assert.equal(policy.isCrisisText(text), true, text);
    assert.equal(safety.isCrisisInput(text), true, text);
  }
});

test('client and companion import the shared policy and keep no local regex copy', () => {
  const worker = readFileSync('worker/sekret-reply.ts', 'utf8');
  const client = readFileSync('services/sekretSafety.ts', 'utf8');
  assert.match(worker, /import \{ isCrisisText \} from ['"]\.\.\/services\/crisisPolicy['"]/);
  assert.match(client, /import \{ isCrisisText \} from ['"]\.\/crisisPolicy['"]/);
  assert.doesNotMatch(worker, /const CRISIS_RE\s*=/);
  assert.doesNotMatch(client, /const CRISIS_INPUT_RE\s*=/);
});
