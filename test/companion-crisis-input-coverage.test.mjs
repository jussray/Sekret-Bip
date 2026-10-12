import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCrisisInput } from '../services/sekretSafety.ts';

const MISSED_BEFORE = [
  'i keep thinking about killing myself',
  'i dont want to live anymore',
  'i want to end it all',
  'i have been cutting myself again',
  'i think about overdose a lot',
];

test('crisis input detector catches phrasings the old regex missed', () => {
  for (const text of MISSED_BEFORE) assert.equal(isCrisisInput(text), true, text);
});

test('ordinary messages are not flagged', () => {
  for (const text of ['im bored, nothing to do', 'my cat knocked over the cup lol']) {
    assert.equal(isCrisisInput(text), false, text);
  }
});

test('server crisis regex matches the client regex (no drift)', () => {
  const pick = (src) => src.match(/const CRISIS_RE = (\/.*\/i);/)?.[1]
    ?? src.match(/const CRISIS_INPUT_RE = (\/.*\/i);/)?.[1];
  const server = pick(readFileSync('worker/sekret-reply.ts', 'utf8'));
  const client = pick(readFileSync('services/sekretSafety.ts', 'utf8'));
  assert.ok(server && client, 'both regexes present');
  assert.equal(server, client);
});
