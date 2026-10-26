import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const local = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
const production = readFileSync(new URL('../playwright.production.config.ts', import.meta.url), 'utf8');

// The local webServer deliberately blanks provider credentials. Production
// read-only tests must remain in the dedicated live browser lane.
test('every production browser spec belongs to the live lane and not local', () => {
  const localIgnored = Array.from(local.matchAll(/'\*\*\/(production-[^']+\.spec\.ts)'/g), match => match[1]);
  const prodIncluded = Array.from(production.matchAll(/'(production-[^']+\.spec\.ts)'/g), match => match[1]);
  assert.ok(localIgnored.length >= 6, 'expected all production browser test files to be separated');
  assert.deepEqual([...new Set(localIgnored)].sort(), [...new Set(prodIncluded)].sort());
});

const live = readFileSync(new URL('../playwright.live-onboarding.config.ts', import.meta.url), 'utf8');
const controlled = readFileSync(new URL('../playwright.controlled-account.config.ts', import.meta.url), 'utf8');

test('credential-gated browser specs stay in their opt-in proof lanes', () => {
  for (const [name, config] of [
    ['live-onboarding-email.spec.ts', live],
    ['live-family-authority.spec.ts', live],
    ['controlled-account-cloud-comfort.spec.ts', controlled],
    ['controlled-account-session-continuity.spec.ts', controlled],
  ]) {
    assert.ok(local.includes(`'**/${name}'`), `${name} must not silently skip inside local smoke`);
    assert.ok(config.includes(`'${name}'`), `${name} must remain in its dedicated proof lane`);
  }
});
