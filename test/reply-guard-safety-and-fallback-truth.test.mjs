import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('sendMessage never lets the voice guard replace a safety reply', async () => {
  const chat = await read('src/services/ai/chat.ts');
  assert.match(chat, /const isSafetyReply = data\.safetyFlag === true;/);
  assert.match(chat, /const guardedReply = isSafetyReply\s*\? rawReply\.trim\(\)/);
  assert.match(chat, /const guardSubstituted = guardBlocked && !isSafetyReply;/);
});

test('sendMessage labels a guard substitution as a fallback', async () => {
  const chat = await read('src/services/ai/chat.ts');
  assert.match(chat, /replySource: isSafetyReply \? 'safety' : guardSubstituted \? 'local-fallback' : 'worker'/);
  assert.match(chat, /fallbackUsed: result\.meta\.fallbackUsed \|\| guardSubstituted/);
  assert.match(chat, /fallback_used: result\.meta\.fallbackUsed \|\| guardSubstituted/);
  assert.doesNotMatch(chat, /fallbackUsed: result\.meta\.fallbackUsed,\n/);
});

test('Pages reply never lets the voice guard replace a safety reply', async () => {
  const pages = await read('src/utils/sekretReply.ts');
  assert.match(pages, /const safetyText = response\.safetyFlag === true \? \(response\.reply \?\? ''\)\.trim\(\) : ''/);
  assert.match(pages, /safetyText\s*\? \{ reply: safetyText, blocked: false \}\s*: guardSekretReply\(response\.reply, fallback\)/);
});

test('Pages reply labels a guard substitution as a fallback, never as worker', async () => {
  const pages = await read('src/utils/sekretReply.ts');
  assert.match(pages, /replySource: guardBlocked \? 'local-fallback' : 'worker'/);
  assert.match(pages, /fallbackUsed: guardBlocked,/);
  assert.doesNotMatch(pages, /replySource: 'worker',\s*fallbackUsed: false/);
});
