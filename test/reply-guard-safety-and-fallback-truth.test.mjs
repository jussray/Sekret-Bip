import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('sendMessage routes safety decisions through the shared reply-guard backstop', async () => {
  const chat = await read('src/services/ai/chat.ts');
  assert.match(chat, /shouldBypassReplyGuard\(rawReply, data\.safetyFlag\)/);
  assert.match(chat, /guardBypass\.bypass\s*\? \{ reply: rawReply\.trim\(\), blocked: false \}\s*: guardSekretReply\(guardInput, sekretFallback\)/);
  assert.match(chat, /const guardSubstituted = guardBlocked && !guardBypass\.bypass;/);
  assert.match(chat, /guardBypass\.reason === 'crisis-resource-backstop'/);
});

test('sendMessage keeps guard substitutions truthfully labeled as fallbacks', async () => {
  const chat = await read('src/services/ai/chat.ts');
  assert.match(chat, /replySource: guardBypass\.bypass \? 'safety' : guardSubstituted \? 'local-fallback' : 'worker'/);
  assert.match(chat, /fallbackUsed: result\.meta\.fallbackUsed \|\| guardSubstituted/);
  assert.match(chat, /fallback_used: result\.meta\.fallbackUsed \|\| guardSubstituted/);
  assert.match(chat, /safety_resource_backstop: safetyBackstopTriggered/);
});

test('sendMessage warning metadata does not include reply content', async () => {
  const chat = await read('src/services/ai/chat.ts');
  assert.match(chat, /blockedReplyLength: rawReply\.length/);
  assert.match(chat, /substitutedReplyLength: guardedReply\.length/);
  assert.doesNotMatch(chat, /blocked:\s*rawReply\.slice/);
  assert.doesNotMatch(chat, /reply_text|replyText/);
});

test('Pages reply recovers resources from an upstream fallback before the reply guard', async () => {
  const pages = await read('src/utils/sekretReply.ts');
  assert.match(pages, /recoverSafetyResourcesFromUpstreamFallback\(\s*input\.text,\s*response\.reply,\s*response\.replySource,\s*\)/);
  assert.match(pages, /const replyForGuard = safetyRecovery\.reply;/);
  assert.match(pages, /response\.safetyFlag \|\| safetyRecovery\.substituted/);
  assert.match(pages, /guardBypass\.bypass\s*\? \{ reply: replyForGuard, blocked: false \}\s*: guardSekretReply\(replyForGuard, fallback\)/);
});

test('Pages reply keeps client substitutions truthfully labeled as local fallbacks', async () => {
  const pages = await read('src/utils/sekretReply.ts');
  assert.match(pages, /const fallbackUsed = guardBlocked \|\| safetyRecovery\.substituted;/);
  assert.match(pages, /replySource: fallbackUsed \? 'local-fallback' : 'worker'/);
  assert.match(pages, /Upstream fallback lacked crisis resources; local safety fallback used/);
  assert.doesNotMatch(pages, /replySource: 'worker',\s*fallbackUsed: false/);
});

test('Pages warning metadata does not include reply content', async () => {
  const pages = await read('src/utils/sekretReply.ts');
  assert.match(pages, /blockedReplyLength: replyForGuard\.length/);
  assert.match(pages, /substitutedReplyLength: guardedReply\.length/);
  assert.doesNotMatch(pages, /blocked:\s*response\.reply/);
  assert.doesNotMatch(pages, /reply_text|replyText/);
});
