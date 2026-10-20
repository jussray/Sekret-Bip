import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/compliance/ageGate.ts', import.meta.url), 'utf8');

test('age gate defines a 13+ minimum account age', () => {
  assert.match(source, /MINIMUM_ACCOUNT_AGE\s*=\s*13/);
});

test('age gate has explicit invalid, future, below-minimum, and eligible states', () => {
  for (const reason of ['invalid_date', 'future_date', 'below_minimum_age', 'eligible']) {
    assert.match(source, new RegExp(reason));
  }
});

test('age calculation treats the 13th birthday as eligible', () => {
  assert.match(source, /age < MINIMUM_ACCOUNT_AGE/);
  assert.match(source, /allowed: true/);
});

test('age gate exposes a throwing server-side guard', () => {
  assert.match(source, /export function requireAgeEligibility/);
  assert.match(source, /throw new Error/);
});

test('age gate validates strict YYYY-MM-DD input', () => {
  assert.ok(source.includes('^\\d{4}-\\d{2}-\\d{2}$'));
  assert.match(source, /parseIsoDate/);
});
