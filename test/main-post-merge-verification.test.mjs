import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const qualityGate = read('.github/workflows/quality-gate.yml');
const playwright = read('.github/workflows/playwright.yml');
const ci = read('.github/workflows/ci.yml');
const regression = read('.github/workflows/regression-tests.yml');

function onBlock(source) {
  return source.match(/^on:\n([\s\S]*?)\n(?:permissions:|env:|concurrency:|jobs:)/m)?.[1] ?? '';
}

function assertManualExactHeadGate(source, name) {
  assert.match(onBlock(source), /workflow_dispatch:/, `${name} must remain manually dispatchable for exact-head proof`);
}

function assertNoAutomaticMainFanout(source, name) {
  assert.doesNotMatch(
    onBlock(source),
    /push:\n\s+branches:(?:\s*\[main\]|\s*\n\s*- main)/,
    `${name} must not reintroduce automatic main-push fan-out while Actions budget mode is active`,
  );
}

test('critical quality workflows remain manual exact-head gates in Actions budget mode', () => {
  for (const [name, source] of [
    ['Quality Gate', qualityGate],
    ['Playwright', playwright],
    ['CI', ci],
    ['Regression', regression],
  ]) {
    assertManualExactHeadGate(source, name);
    assertNoAutomaticMainFanout(source, name);
  }
});

test('manual verification includes tests, retained failure evidence, build export, RLS evidence, and browser smoke', () => {
  assert.match(qualityGate, /npm test/);
  assert.match(qualityGate, /unit-test-output\.log/);
  assert.match(qualityGate, /unit-test-failure-evidence/);
  assert.match(qualityGate, /verify:implementation-ledger/);
  assert.match(qualityGate, /audit:control-room:rls/);
  assert.match(ci, /npm run verify:bundle/);
  assert.match(playwright, /npx playwright test/);
});

test('browser workflow remains an explicit manual release-proof gate', () => {
  const triggerBlock = onBlock(playwright);
  assert.match(triggerBlock, /workflow_dispatch:/);
  assert.doesNotMatch(triggerBlock, /pull_request:/);
  assert.match(playwright, /npx playwright test --config=playwright\.founder-preview\.config\.ts/);
});
