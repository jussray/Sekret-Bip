/**
 * Worker identity disclosure (Trust-08 / #419): a sincere, direct question
 * about whether the companion is real/human/AI must get an honest answer,
 * never a denial — even though the general voice rule forbids breaking the
 * peer fiction.
 *
 * Follows the same source-pattern-assertion convention as worker-safety.test.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../worker/sekret-reply.ts', import.meta.url), 'utf8');

// ─── Extract live IDENTITY_RE from source ────────────────────────────────────
const identityLine = worker.split('\n').find(l => l.includes('const IDENTITY_RE ='));
assert.ok(identityLine, 'IDENTITY_RE must be defined in sekret-reply.ts');

const rawRegex = identityLine.replace(/^.*const IDENTITY_RE = /, '').replace(/;.*$/, '').trim();
const IDENTITY_RE = new Function(`return ${rawRegex}`)();

// ─── Extract live CRISIS_RE too, to prove ordering ───────────────────────────
const crisisLine = worker.split('\n').find(l => l.includes('const CRISIS_RE ='));
const CRISIS_RE = new Function(`return ${crisisLine.replace(/^.*const CRISIS_RE = /, '').replace(/;.*$/, '').trim()}`)();

test('IDENTITY_RE matches sincere, direct identity questions', () => {
  assert.ok(IDENTITY_RE.test('are you real'), 'are you real');
  assert.ok(IDENTITY_RE.test('Are you real?'), 'Are you real? (case + punctuation)');
  assert.ok(IDENTITY_RE.test('are you human'), 'are you human');
  assert.ok(IDENTITY_RE.test('are you an ai'), 'are you an ai');
  assert.ok(IDENTITY_RE.test('are you a bot'), 'are you a bot');
  assert.ok(IDENTITY_RE.test('are you a robot'), 'are you a robot');
  assert.ok(IDENTITY_RE.test('is this an ai'), 'is this an ai');
  assert.ok(IDENTITY_RE.test('is that a bot'), 'is that a bot');
  assert.ok(IDENTITY_RE.test('am i talking to a human'), 'am i talking to a human');
  assert.ok(IDENTITY_RE.test('r u real'), 'r u real');
});

test('IDENTITY_RE does not false-positive on unrelated phrases', () => {
  assert.ok(!IDENTITY_RE.test('are you busy later'));
  assert.ok(!IDENTITY_RE.test('are you a real friend to her'));
  assert.ok(!IDENTITY_RE.test('that outfit is a bot move'));
  assert.ok(!IDENTITY_RE.test('i am so bored'));
});

test('CRISIS_RE still wins when a message matches both patterns', () => {
  // Safety always takes priority over identity honesty.
  const bothMatch = 'i want to kill myself, are you real';
  assert.ok(CRISIS_RE.test(bothMatch) && IDENTITY_RE.test(bothMatch));
  const crisisCheckIdx = worker.indexOf("if (CRISIS_RE.test(text)) return 'safety_crisis'");
  const identityCheckIdx = worker.indexOf("if (IDENTITY_RE.test(text)) return 'identity_question'");
  assert.ok(crisisCheckIdx > 0, 'crisis check must exist');
  assert.ok(identityCheckIdx > 0, 'identity check must exist');
  assert.ok(crisisCheckIdx < identityCheckIdx, 'crisis check must precede identity check in detectIntent');
});

test('identity_question intent returns identityReply before any OpenAI call', () => {
  const identityGuardIdx = worker.indexOf("if (intent === 'identity_question')");
  const openAiCallIdx = worker.indexOf('openai.com/v1/chat/completions');
  assert.ok(identityGuardIdx > 0, 'identity guard must exist');
  assert.ok(openAiCallIdx > 0, 'OpenAI call must exist');
  assert.ok(identityGuardIdx < openAiCallIdx, 'identity guard must come before OpenAI call');
});

test('identityReply discloses AI status honestly for every character', () => {
  assert.match(worker, /I'm an AI companion, not a human\. I'm not pretending otherwise/);
});

test('identityReply never sets safetyFlag and never suggests sharing with a parent', () => {
  const fnStart = worker.indexOf('function identityReply(');
  const fnEnd = worker.indexOf('\n}', fnStart);
  const fnBody = worker.slice(fnStart, fnEnd);
  assert.match(fnBody, /safetyFlag: false/);
  assert.match(fnBody, /parentShareSummary: null/);
});

test('master voice rule carves out an explicit honesty exception to the peer fiction', () => {
  assert.match(
    worker,
    /Never say "as an AI," "I'm an AI," or anything that breaks the peer fiction — except when the teen sincerely and directly asks/,
  );
});

test("Se'kret character prompt carves out the same honesty exception", () => {
  assert.match(
    worker,
    /Never says "as an AI" or breaks the experience — except when sincerely and directly asked/,
  );
});
