/**
 * Crisis input parity.
 *
 * The server CRISIS_RE (worker/sekret-reply.ts) decides whether a teen receives
 * the crisis reply. The client pre-flight sheet and the local safety fallback
 * must recognise at least the same terms, or the sheet and the reply disagree
 * about the same message. These are source-level checks, like their neighbours.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const serverSource = read('worker/sekret-reply.ts');
const preFlightSource = read('src/features/safety/safetyCoordinator.ts');
const localInputSource = read('services/sekretSafety.ts');

// Plain substrings present in every crisis regex that must stay in step.
const TERMS = [
  'kill myself', 'end my life', 'want to die', 'suicid', 'harm',
  'hurt myself', 'disappear forever', 'run away', 'abuse', 'assault',
  'unsafe', 'not safe', 'danger', 'emergency',
];

const serverRe = serverSource.slice(
  serverSource.indexOf('export const CRISIS_RE'),
  serverSource.indexOf(';', serverSource.indexOf('export const CRISIS_RE')),
);
const preFlightImmediate = preFlightSource.slice(
  preFlightSource.indexOf('// immediate_danger'),
  preFlightSource.indexOf('// concerning_pattern'),
);
const localInputRe = localInputSource.slice(
  localInputSource.indexOf('const CRISIS_INPUT_RE'),
  localInputSource.indexOf(';', localInputSource.indexOf('const CRISIS_INPUT_RE')),
);
const companionSource = read('src/features/sekret/companionEngine.ts');
const companionRe = companionSource.slice(
  companionSource.indexOf('const CRISIS_PATTERN'),
  companionSource.indexOf(';', companionSource.indexOf('const CRISIS_PATTERN')),
);

test('server crisis regex carries the full term list this parity test guards', () => {
  for (const term of TERMS) {
    assert.ok(serverRe.includes(term), `server CRISIS_RE is missing: ${term}`);
  }
});

test('client pre-flight immediate tier recognises every server crisis term', () => {
  for (const term of TERMS) {
    assert.ok(preFlightImmediate.includes(term), `pre-flight immediate tier is missing: ${term}`);
  }
});

test('client local safety fallback recognises every server crisis term', () => {
  for (const term of TERMS) {
    assert.ok(localInputRe.includes(term), `local CRISIS_INPUT_RE is missing: ${term}`);
  }
});

test('companion engine safety trigger recognises every server crisis term', () => {
  for (const term of TERMS) {
    assert.ok(companionRe.includes(term), `companion engine CRISIS_PATTERN is missing: ${term}`);
  }
});
