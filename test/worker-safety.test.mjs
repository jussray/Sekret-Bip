/**
 * Worker safety: crisis detection, safety flag, parent share summary.
 *
 * These tests verify the contract of sekret-reply.ts without running
 * the Cloudflare Worker runtime. Pure-logic functions are extracted from
 * source text; structural guarantees are asserted on source patterns.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../worker/sekret-reply.ts', import.meta.url), 'utf8');

// ─── Extract live CRISIS_RE from source ──────────────────────────────────────
// The regex literal lives on a single line; grab it and reconstruct.
const crisisLine = worker.split('\n').find(l => l.includes('const CRISIS_RE ='));
assert.ok(crisisLine, 'CRISIS_RE must be defined in sekret-reply.ts');

// Reconstruct the regex so behavioral tests run against the real pattern.
const rawRegex = crisisLine.replace(/^.*const CRISIS_RE = /, '').replace(/;.*$/, '').trim();
const CRISIS_RE = new Function(`return ${rawRegex}`)();

// ─── Extract crisisReply lead strings ────────────────────────────────────────
const hasHotline988    = /988/.test(worker);
const hasHotline741741 = /741741/.test(worker);
const hasHotline911    = /911/.test(worker);

// ─── Crisis regex: must match all variants ───────────────────────────────────
test('CRISIS_RE matches direct self-harm phrases', () => {
  assert.ok(CRISIS_RE.test('I want to kill myself'),       'kill myself');
  assert.ok(CRISIS_RE.test('I want to end my life'),       'end my life');
  assert.ok(CRISIS_RE.test('I want to die'),               'want to die');
  assert.ok(CRISIS_RE.test('I am suicidal'),               'suicidal');
  assert.ok(CRISIS_RE.test('thinking about suicide'),      'suicide');
  assert.ok(CRISIS_RE.test('I want to hurt myself'),       'hurt myself');
  assert.ok(CRISIS_RE.test('I cut myself'),                'cut myself');
  assert.ok(CRISIS_RE.test('self-harm is on my mind'),     'self-harm hyphenated');
  assert.ok(CRISIS_RE.test('self harm is on my mind'),     'self harm spaced');
});

test('CRISIS_RE matches abuse and danger phrases', () => {
  assert.ok(CRISIS_RE.test('I am being abused'),     'abused');
  assert.ok(CRISIS_RE.test('there was an assault'),  'assault');
  assert.ok(CRISIS_RE.test('I am not safe here'),    'not safe');
  assert.ok(CRISIS_RE.test('this is an emergency'),  'emergency');
  assert.ok(CRISIS_RE.test('I feel unsafe'),         'unsafe');
});

test('CRISIS_RE matches case-insensitively', () => {
  assert.ok(CRISIS_RE.test('KILL MYSELF'));
  assert.ok(CRISIS_RE.test('Want To Die'));
  assert.ok(CRISIS_RE.test('SUICIDE'));
});

test('CRISIS_RE does not false-positive on safe phrases', () => {
  assert.ok(!CRISIS_RE.test('hey what are you up to'));
  assert.ok(!CRISIS_RE.test('I had a rough day'));
  assert.ok(!CRISIS_RE.test('I am so bored'));
  assert.ok(!CRISIS_RE.test('this movie made me sad'));
  assert.ok(!CRISIS_RE.test('I feel like dancing'));
});

// ─── crisisReply contract ────────────────────────────────────────────────────
test('crisisReply always sets safetyFlag=true', () => {
  assert.match(worker, /safetyFlag: true/);
});

test('crisisReply sets parentShareSummary=null when parentSharingEnabled=false', () => {
  assert.match(
    worker,
    /parentSharingEnabled \? 'Safety concern.*?' : null/,
  );
});

test('crisisReply parentShareSummary mentions "Safety concern" when sharing enabled', () => {
  assert.match(worker, /Safety concern: teen may need trusted adult or emergency support\./);
});

test('crisisReply parentShareSummary contains no verbatim-text prompt', () => {
  // The brain prompt explicitly forbids verbatim journal text in parentShareSummary.
  assert.match(worker, /Never expose private journal text verbatim in parentShareSummary/i);
});

test('crisisReply reply includes 988 crisis line', () => {
  assert.ok(hasHotline988, 'Worker reply must reference 988 crisis line');
});

test('crisisReply reply includes Crisis Text Line 741741', () => {
  assert.ok(hasHotline741741, 'Worker reply must reference 741741 crisis text line');
});

test('crisisReply reply includes 911 for immediate danger', () => {
  assert.ok(hasHotline911, 'Worker reply must reference 911 for immediate danger');
});

test('crisisReply tone is supportive-safety', () => {
  assert.match(worker, /tone: 'supportive-safety'/);
});

test('crisisReply suggestedComfortTool is safety-plan', () => {
  assert.match(worker, /suggestedComfortTool: 'safety-plan'/);
});

// ─── Safety path fires before OpenAI ─────────────────────────────────────────
test('safety_crisis intent returns crisis reply before any OpenAI call', () => {
  // The guard must appear before the openai fetch call in the source.
  const crisisGuardIdx = worker.indexOf('if (intent === \'safety_crisis\'');
  const openAiCallIdx  = worker.indexOf('openai.com/v1/chat/completions');
  assert.ok(crisisGuardIdx > 0,          'Crisis guard must exist');
  assert.ok(openAiCallIdx  > 0,          'OpenAI call must exist');
  assert.ok(crisisGuardIdx < openAiCallIdx, 'Crisis guard must come before OpenAI call');
});

test('CRISIS_RE.test() is also called as a guard independent of detectIntent', () => {
  // Belt-and-suspenders: raw text is re-tested after intent detection.
  assert.match(worker, /CRISIS_RE\.test\(userText\)/);
});

// ─── normalizeCharacter for characters ───────────────────────────────────────
test('normalizeCharacter handles all valid CharacterIds', () => {
  assert.match(worker, /return 'raylene'/);
  assert.match(worker, /return 'rylane'/);
  assert.match(worker, /return 'cloud'/);
  assert.match(worker, /return 'night'/);
  assert.match(worker, /return 'sekret'/);
  assert.match(worker, /return 'parentCoach'/);
});

test('normalizeCharacter returns null for unknown input', () => {
  assert.match(worker, /return null;\s*\}[\s\S]*function normalizeSurface/);
});

// ─── detectIntent intent ordering ────────────────────────────────────────────
test('detectIntent checks CRISIS_RE first before any other intent', () => {
  // Crisis check must be the very first conditional inside detectIntent.
  const fnStart = worker.indexOf('function detectIntent(');
  const crisisCheck = worker.indexOf('if (CRISIS_RE.test(text)) return \'safety_crisis\'');
  const greetingCheck = worker.indexOf('return \'greeting\'');
  assert.ok(fnStart > 0,        'detectIntent must be defined');
  assert.ok(crisisCheck > fnStart, 'Crisis check must be inside detectIntent');
  assert.ok(crisisCheck < greetingCheck, 'Crisis check must precede greeting check');
});

// ─── parentCoach surface parentShareSummary rules ────────────────────────────
test('parentCoach surface always sets parentShareSummary to null', () => {
  assert.match(worker, /parentShareSummary: always null/);
  assert.match(worker, /Never generate a parentShareSummary/i);
});

// ─── CompanionReply interface contract ───────────────────────────────────────
test('CompanionReply interface defines safetyFlag and parentShareSummary', () => {
  assert.match(worker, /safetyFlag: boolean/);
  assert.match(worker, /parentShareSummary: string \| null/);
});
