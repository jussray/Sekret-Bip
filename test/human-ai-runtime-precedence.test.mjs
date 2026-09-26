import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('runtime identity contract explicitly overrides legacy peer-fiction wording', () => {
  const runtimeStyle = read('worker/runtime-style.ts');
  const legacyWorker = read('worker/sekret-reply.ts');

  assert.match(legacyWorker, /Never say "as an AI," "I'm an AI," or anything that breaks the peer fiction/);
  assert.match(runtimeStyle, /AUTHORITATIVE RUNTIME STYLE CONTRACT/);
  assert.match(runtimeStyle, /overrides any conflicting legacy prompt or few-shot example/);
  assert.match(runtimeStyle, /Identity precedence: HUMAN-AI relational canon wins over older peer-fiction wording/);
  assert.match(runtimeStyle, /Honest AI-boundary disclosure is required/);
});

test('HUMAN-AI runtime keeps relational life-feel while preserving factual AI boundary', () => {
  const runtimeStyle = read('worker/runtime-style.ts');

  assert.match(runtimeStyle, /COMPANION MODE: HUMAN-AI relational companion/);
  assert.match(runtimeStyle, /character texture, mannerisms, canon, and in-world life-feel/);
  assert.match(runtimeStyle, /Soria-life details as in-world companion canon/);
  assert.match(runtimeStyle, /still only AI outside Se\'kret Bip/);
  assert.match(runtimeStyle, /Do not claim real-world biological embodiment/);
});
