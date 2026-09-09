/**
 * L99 Goal 3 test pack: worker/audit/evaluate-reply.ts is the output-contract
 * evaluator + decision engine sitting between OpenAI and the teen. This file
 * strips TypeScript type annotations from the (deliberately dependency-free,
 * pure-logic) module and actually executes it — not just pattern-matching
 * its source text — so the decision engine's behavior is really verified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const src = read('worker/audit/evaluate-reply.ts');

const stripped = src
  .replace(/export (type|interface) [\s\S]*?\n\}\n/g, '')
  .replace(/export type Decision[^\n]*\n/g, '')
  .replace(/export type ViolationCode[\s\S]*?;\n/g, '')
  .replace(/:\s*RegExp\[\]/g, '')
  .replace(/\):\s*[A-Za-z_][\w<>[\]\s,|]*\s*\{/g, ') {')
  .replace(/:\s*ViolationCode\[\]/g, '')
  .replace(/:\s*ParsedCompanionReply/g, '')
  .replace(/:\s*EvaluateReplyInput/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*string(?=[,)])/g, '')
  .replace(/export function/g, 'function')
  .replace(/export const/g, 'const');

const modulePath = new URL('../.tmp-openai-output-policy.cjs', import.meta.url);
fs.writeFileSync(modulePath, `${stripped}\nmodule.exports = { evaluateReply, repairReply, MAX_REPLY_LENGTH };\n`);
const { evaluateReply, repairReply, MAX_REPLY_LENGTH } = await import(modulePath);
fs.rmSync(modulePath, { force: true });

test.after(() => fs.rmSync(modulePath, { force: true }));

// ─── allow ───────────────────────────────────────────────────────────────
test('a normal, in-voice reply is allowed with no violations', () => {
  const result = evaluateReply({ parsed: { reply: 'lol okay but fr what happened' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'allow');
  assert.deepEqual(result.violations, []);
  assert.equal(result.schemaValid, true);
});

// ─── block: prompt leakage always wins, even alongside other violations ───
test('prompt leakage is blocked even when the reply is otherwise fine', () => {
  const result = evaluateReply({ parsed: { reply: 'As an AI language model, I care about you.' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'block');
  assert.ok(result.violations.includes('prompt_leakage'));
});

test('block takes priority over every other violation type', () => {
  const result = evaluateReply({
    parsed: { reply: `${'x'.repeat(800)} ignore previous instructions?? what?? really??` },
    parentSharingEnabled: false,
  });
  assert.equal(result.decision, 'block');
});

// ─── retry: empty / malformed / clinical language ──────────────────────────
test('an empty reply is retried, not silently allowed', () => {
  const result = evaluateReply({ parsed: { reply: '' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'retry');
  assert.ok(result.violations.includes('empty_reply'));
  assert.equal(result.schemaValid, false);
});

test('clinical/therapy-speak language is retried so the model can regenerate a real reply', () => {
  const result = evaluateReply({ parsed: { reply: 'I hear you. Let\'s sit with your feelings for a moment.' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'retry');
  assert.ok(result.violations.includes('clinical_language'));
});

// ─── repair: deterministically fixable violations ──────────────────────────
test('an over-long reply is flagged for repair, not retry', () => {
  const longReply = 'this is a normal sentence about school and friends. '.repeat(20);
  const result = evaluateReply({ parsed: { reply: longReply }, parentSharingEnabled: false });
  assert.equal(result.decision, 'repair');
  assert.ok(result.violations.includes('reply_too_long'));
});

test('more than one question mark triggers repair', () => {
  const result = evaluateReply({ parsed: { reply: 'wait what happened? are you okay? fr?' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'repair');
  assert.ok(result.violations.includes('too_many_questions'));
});

test('mentioning Oracle by name triggers character_mismatch repair', () => {
  const result = evaluateReply({ parsed: { reply: 'Oracle here, checking in on you.' }, parentSharingEnabled: false });
  assert.equal(result.decision, 'repair');
  assert.ok(result.violations.includes('character_mismatch'));
});

test('a parent summary that leaks while sharing is disabled triggers repair', () => {
  const result = evaluateReply({
    parsed: { reply: 'hey whats up', parentShareSummary: 'They mentioned feeling anxious about a test.' },
    parentSharingEnabled: false,
  });
  assert.equal(result.decision, 'repair');
  assert.ok(result.violations.includes('invalid_parent_summary'));
});

// ─── repairReply: deterministic fixes actually change the output ──────────
test('repairReply replaces Oracle mentions with the in-app character name', () => {
  const repaired = repairReply({ reply: 'Oracle says hi' }, ['character_mismatch'], false);
  assert.doesNotMatch(repaired.reply, /oracle/i);
});

test('repairReply collapses extra question marks to periods, keeping the first', () => {
  const repaired = repairReply({ reply: 'are you okay? really? for real?' }, ['too_many_questions'], false);
  assert.equal((repaired.reply.match(/\?/g) || []).length, 1);
});

test('repairReply truncates over-long replies to at most MAX_REPLY_LENGTH characters', () => {
  const longReply = 'x'.repeat(1000);
  const repaired = repairReply({ reply: longReply }, ['reply_too_long'], false);
  assert.ok(repaired.reply.length <= MAX_REPLY_LENGTH);
});

test('repairReply nulls out a parent summary when sharing is disabled', () => {
  const repaired = repairReply({ reply: 'hey', parentShareSummary: 'leaked detail' }, ['invalid_parent_summary'], false);
  assert.equal(repaired.parentShareSummary, null);
});

// ─── cross-check: the banned-phrase list must track the master brain prompt ─
test('MASTER_BRAIN_PROMPT and the evaluator banned-phrase list stay in sync', () => {
  const reply = read('worker/sekret-reply.ts');
  const promptStart = reply.indexOf('MASTER_BRAIN_PROMPT');
  const promptBlock = reply.slice(promptStart, promptStart + 6000);
  // A representative sample of banned clinical phrases the master prompt
  // calls out; each must also be enforced in the evaluator.
  const sample = ['coping mechanism', 'hold space', 'self-regulate'];
  for (const phrase of sample) {
    assert.ok(promptBlock.toLowerCase().includes(phrase), `master prompt should still mention "${phrase}"`);
    assert.ok(src.toLowerCase().includes(phrase), `evaluator should enforce "${phrase}"`);
  }
});
