/**
 * Identity resolution: character normalization, sekret/oracle aliasing,
 * userSide boundaries, parentCoach isolation.
 *
 * Tests run against source text so they catch regressions without
 * requiring a build step.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workerSrc = fs.readFileSync(new URL('../worker/sekret-reply.ts', import.meta.url), 'utf8');
const apiSrc    = fs.readFileSync(new URL('../src/utils/api.ts',       import.meta.url), 'utf8');

// Reconstruct normalizeCharacter from the worker source for behavioral tests.
// The function is pure and has no CF-Worker dependencies.
const fnMatch = workerSrc.match(
  /function normalizeCharacter\(value: unknown\): CharacterId \| null \{([\s\S]*?)\n\}/,
);
assert.ok(fnMatch, 'normalizeCharacter must be extractable from worker source');

// Build a plain-JS equivalent by stripping TypeScript annotations.
const fnBody = fnMatch[1]
  .replace(/: unknown/g, '')
  .replace(/: CharacterId \| null/g, '')
  .replace(/: string/g, '');

const normalizeCharacter = new Function('value', fnBody);  

// ─── normalizeCharacter behavioral tests ─────────────────────────────────────
test('normalizeCharacter returns raylene for "raylene"', () => {
  assert.equal(normalizeCharacter('raylene'), 'raylene');
});

test('normalizeCharacter returns rylane for "rylane"', () => {
  assert.equal(normalizeCharacter('rylane'), 'rylane');
});

test('normalizeCharacter returns cloud for "cloud"', () => {
  assert.equal(normalizeCharacter('cloud'), 'cloud');
});

test('normalizeCharacter returns night for "night"', () => {
  assert.equal(normalizeCharacter('night'), 'night');
});

test('normalizeCharacter returns sekret for "sekret"', () => {
  assert.equal(normalizeCharacter('sekret'), 'sekret');
});

test('normalizeCharacter maps "oracle" → "sekret" (legacy alias)', () => {
  assert.equal(normalizeCharacter('oracle'), 'sekret');
});

test('normalizeCharacter maps "secret" → "sekret" (common misspelling)', () => {
  assert.equal(normalizeCharacter('secret'), 'sekret');
});

test('normalizeCharacter maps "parentCoach" → "parentCoach"', () => {
  assert.equal(normalizeCharacter('parentCoach'), 'parentCoach');
});

test('normalizeCharacter maps "parent_coach" → "parentCoach"', () => {
  assert.equal(normalizeCharacter('parent_coach'), 'parentCoach');
});

test('normalizeCharacter maps "parent-coach" → "parentCoach"', () => {
  assert.equal(normalizeCharacter('parent-coach'), 'parentCoach');
});

test('normalizeCharacter is case-insensitive', () => {
  assert.equal(normalizeCharacter('RAYLENE'), 'raylene');
  assert.equal(normalizeCharacter('Rylane'), 'rylane');
  assert.equal(normalizeCharacter('CLOUD'), 'cloud');
  assert.equal(normalizeCharacter('SEKRET'), 'sekret');
  assert.equal(normalizeCharacter('Oracle'), 'sekret');
});

test('normalizeCharacter strips smart quotes from input', () => {
  // Curly apostrophes in pasted text must not break resolution.
  assert.equal(normalizeCharacter('‘raylene’'), 'raylene');
});

test('normalizeCharacter returns null for completely unknown input', () => {
  assert.equal(normalizeCharacter('wizard'),     null);
  assert.equal(normalizeCharacter(''),           null);
  assert.equal(normalizeCharacter(null),         null);
  assert.equal(normalizeCharacter(undefined),    null);
  assert.equal(normalizeCharacter(42),           null);
});

// ─── Oracle → Se'kret rename in companion replies ────────────────────────────
test('Worker renames Oracle to Se\'kret in replies so the hidden identity stays hidden', () => {
  assert.match(workerSrc, /replace\(\/\\bOracle\\b\/gi, "Se'kret"\)/);
});

test('Client API also routes oracle → sekret for consistency', () => {
  assert.match(apiSrc, /raw === 'oracle'.*return 'sekret'/s);
});

// ─── CharacterId type coverage ────────────────────────────────────────────────
test('Worker defines all six CharacterIds in the type', () => {
  assert.match(workerSrc, /type CharacterId = /);
  for (const id of ['raylene', 'rylane', 'cloud', 'night', 'sekret', 'parentCoach']) {
    assert.match(workerSrc, new RegExp(`'${id}'`), `CharacterId must include '${id}'`);
  }
});

// ─── parentCoach isolation ────────────────────────────────────────────────────
test('parentCoach surface never generates a parentShareSummary', () => {
  // parentCoach is a parent-to-parent surface; it must explicitly null the summary.
  assert.match(workerSrc, /parentShareSummary: always null/);
});

test('parentCoach has its own surface constant in Surface type', () => {
  assert.match(workerSrc, /type Surface = .*'parentCoach'/s);
});

// ─── userSide values ──────────────────────────────────────────────────────────
test('useAppStore defines userSide as teen or parent', () => {
  const storeSrc = fs.readFileSync(
    new URL('../src/store/useAppStore.ts', import.meta.url),
    'utf8',
  );
  assert.match(storeSrc, /'teen' \| 'parent'/);
});

test('userSide is persisted to AsyncStorage via the storage keys map', () => {
  const storageSrc = fs.readFileSync(
    new URL('../src/utils/storage.ts', import.meta.url),
    'utf8',
  );
  assert.match(storageSrc, /userSide/);
});

// ─── Legacy 'soft' key compatibility ─────────────────────────────────────────
test('character utils map the legacy "soft" key to raylene', () => {
  const charUtils = fs.readFileSync(
    new URL('../src/utils/characterUtils.ts', import.meta.url),
    'utf8',
  );
  assert.match(charUtils, /'soft'.*'raylene'|'raylene'.*'soft'/s);
});
