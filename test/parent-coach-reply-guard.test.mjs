import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const normalizeParentCoachGuardInput = (reply) =>
  reply.replace(/\s*(?:—|–|--)\s*/g, ' ').replace(/\s+/g, ' ').trim();

test('parent coach receives a parent-safe local fallback on every failure path', async () => {
  const chat = await read('src/services/ai/chat.ts');

  assert.match(chat, /if \(personalityId === 'parentCoach'\) \{/);
  assert.match(chat, /Start with what happened at home and what you want to handle differently\./);
  assert.match(chat, /const fallbackText = localFallback\(personalityId, text, learnedRelationship\)/);

  const parentBranch = chat.match(/if \(personalityId === 'parentCoach'\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
  assert.doesNotMatch(parentBranch, /girl|aight|gang|what REALLY happened/i);
});

test('parent coach dashes are preserved without bypassing the rest of the reply guard', async () => {
  const chat = await read('src/services/ai/chat.ts');

  assert.equal(normalizeParentCoachGuardInput("I'm here — to support you"), "I'm here to support you");
  assert.equal(normalizeParentCoachGuardInput('Pause -- then answer'), 'Pause then answer');
  assert.match(chat, /const isParentCoach = personalityId === 'parentCoach'/);
  assert.ok(chat.includes("rawReply.replace(/\\s*(?:—|–|--)\\s*/g, ' ').replace(/\\s+/g, ' ').trim()"));
  assert.doesNotMatch(chat, /rawReply\.replace\(\/\[—–\]\/g, '-'\)/);
  assert.match(chat, /const guardedCandidate = keepSekretReply\(guardInput, sekretFallback\)/);
  assert.match(chat, /const guardBlocked = guardedCandidate !== guardInput\.trim\(\)/);
  assert.match(chat, /isParentCoach && !guardBlocked\s*\? rawReply\.trim\(\)\s*:\s*guardedCandidate/);
  assert.match(chat, /keeps blocked word sequences contiguous/);
});

test('teen companion surfaces still use the original strict reply guard', async () => {
  const chat = await read('src/services/ai/chat.ts');

  assert.match(chat, /const guardInput = isParentCoach[\s\S]*:\s*rawReply;/);
  assert.match(chat, /getSekretFallback\(personalityId, text\)/);
});
