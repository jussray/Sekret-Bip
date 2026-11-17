import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Regression guard for the bug e2e/reply-guard-safety.spec.ts catches on the
// live Pages screen: sendCompanionMessage() used to hand fetchSekretBrainReply's
// raw reply straight to the UI, so a crisis message typed while the Worker was
// unavailable rendered a generic fallback with no 911/988/741741 resources.
// src/utils/sekretReply.ts and src/services/ai/chat.ts already recover those
// resources on their surfaces — this asserts companionEngine.ts does too.

test('sendCompanionMessage recovers crisis resources from the upstream fallback', async () => {
  const source = await read('src/features/sekret/companionEngine.ts');

  assert.match(source, /import\s*\{[^}]*\brecoverSafetyResourcesFromUpstreamFallback\b[^}]*\}\s*from\s*['"].*sekretSafety['"]/);
  assert.match(
    source,
    /const result = await fetchSekretBrainReply\(request\);[\s\S]*recoverSafetyResourcesFromUpstreamFallback\(\s*input\.text,\s*result\.reply,\s*result\.replySource,\s*\)/,
  );
  assert.match(source, /shouldBypassReplyGuard\(\s*safetyRecovery\.reply,/);
  assert.match(source, /guardSekretReply\(safetyRecovery\.reply, fallback\)/);
  assert.match(source, /reply:\s*guardedReply/);
});

test('sendCompanionMessage applies the voice guard without replacing safety replies', async () => {
  const source = await read('src/features/sekret/companionEngine.ts');

  assert.match(source, /guardBypass\.bypass\s*\?\s*\{ reply: safetyRecovery\.reply, blocked: false \}/);
  assert.match(source, /result\.safetyFlag \|\| safetyRecovery\.substituted/);
  assert.match(source, /getLocalSafetyFallback\(input\.text\) \?\? getSekretFallback\(companionId, input\.text\)/);
  assert.match(source, /replySource:\s*guardBlocked \? 'fallback'/);
});
