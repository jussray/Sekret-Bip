import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  TEST_SKIP_MARKER,
  buildSkipObservation,
  parseNodeTapSkip,
  parseSkipMarker,
} from '../scripts/control-room-test-skips.mjs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const HEAD_A = '1111111111111111111111111111111111111111';
const HEAD_B = '2222222222222222222222222222222222222222';

test('skip fingerprints and proof cookies are stable, exact-head bound, and non-authorizing', () => {
  const input = {
    repository: 'jussray/Sekret-Bip',
    headSha: HEAD_A,
    runner: 'node_test',
    command: 'node --test test/example.test.mjs',
    testId: 'provider contract',
    testFile: 'test/example.test.mjs',
    reason: 'PROVIDER_URL is required.',
    surface: 'local',
  };
  const first = buildSkipObservation(input);
  const repeat = buildSkipObservation(input);
  const moved = buildSkipObservation({ ...input, headSha: HEAD_B });

  assert.equal(first.fingerprint, repeat.fingerprint);
  assert.equal(first.proof_cookie, repeat.proof_cookie);
  assert.notEqual(first.fingerprint, moved.fingerprint);
  assert.notEqual(first.proof_cookie, moved.proof_cookie);
  assert.equal(first.classification, 'missing_prerequisite');
  assert.equal(first.authority, false);
  assert.equal(first.merge_authority, false);
  assert.equal(first.proof_satisfied, false);
  assert.equal(first.investigation_required, true);
  assert.equal(first.blocks_claimed_proof, true);
});

test('GitHub rebinds a log marker to trusted repository, head, workflow, run, and job evidence', () => {
  const untrusted = buildSkipObservation({
    repository: 'attacker/fake',
    headSha: HEAD_B,
    runner: 'playwright',
    testId: 'signup path',
    reason: 'LIVE_ONBOARDING_EMAIL is required.',
    surface: 'local',
  });
  const parsed = parseSkipMarker(`${TEST_SKIP_MARKER}${JSON.stringify(untrusted)}`, {
    repository: 'jussray/Sekret-Bip',
    headSha: HEAD_A,
    surface: 'github_actions',
    workflow: 'Live Signup Proof',
    runId: 123,
    job: 'readiness',
  });

  assert.equal(parsed.repository, 'jussray/Sekret-Bip');
  assert.equal(parsed.head_sha, HEAD_A);
  assert.equal(parsed.surface, 'github_actions');
  assert.equal(parsed.workflow, 'Live Signup Proof');
  assert.equal(parsed.run_id, '123');
  assert.equal(parsed.job, 'readiness');
  assert.equal(parsed.authority, false);
});

test('Node TAP skips are parsed without turning the skipped test into a passing witness', () => {
  assert.deepEqual(
    parseNodeTapSkip('ok 7 - Supabase fixture boundary # SKIP contract test skipped; missing env: SUPABASE_URL'),
    {
      testId: 'Supabase fixture boundary',
      reason: 'contract test skipped; missing env: SUPABASE_URL',
    },
  );
  assert.equal(parseNodeTapSkip('ok 8 - ordinary passing test'), null);
});

test('unit and browser runners emit durable skip receipts', () => {
  const unit = read('scripts/run-unit-tests.mjs');
  const reporter = read('scripts/control-room-playwright-skip-reporter.mjs');
  assert.match(unit, /--test-reporter=tap/);
  assert.match(unit, /test-skips-latest\.json/);
  assert.match(unit, /CONTROL_ROOM_TEST_SKIPS_REQUIRE_INVESTIGATION/);
  assert.match(reporter, /result\.status !== 'skipped'/);
  assert.match(reporter, /playwright-test-skips-latest\.json/);

  for (const config of [
    'playwright.config.ts',
    'playwright.production.config.ts',
    'playwright.live-onboarding.config.ts',
    'playwright.controlled-account.config.ts',
  ]) {
    assert.match(read(config), /control-room-playwright-skip-reporter\.mjs/);
  }
});

test('local Control Room warns on skip receipts and can publish each skip independently', () => {
  const local = read('scripts/control-room-local.js');
  const ingest = read('scripts/control-room-ingest-local-report.mjs');
  assert.match(local, /combined\.includes\(TEST_SKIP_MARKER\).*return 'warning'/s);
  assert.match(local, /Skipped tests are warning evidence, never silent green proof/);
  assert.match(ingest, /test-skips-latest\.json/);
  assert.match(ingest, /local_test_skipped/);
  assert.match(ingest, /p_fingerprint: item\.fingerprint/);
  assert.match(ingest, /proof_cookie: item\.proof_cookie/);
});

test('GitHub watcher scans successful, failed, and skipped launch-proof workflows for test skips', () => {
  const watcher = read('.github/workflows/control-room-github-failures.yml');
  const scanner = read('scripts/control-room-ingest-github-test-skips.mjs');
  for (const workflow of [
    'CI',
    'Quality Gate',
    'Playwright Smoke and Guardrails',
    'Production Smoke',
    'Live Signup Proof',
    'Controlled Account Cloud Comfort Proof',
    'Owned Bip Signup Proof',
  ]) {
    assert.match(watcher, new RegExp(workflow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(watcher, /route-test-skips:/);
  assert.match(watcher, /control-room-ingest-github-test-skips\.mjs/);
  assert.match(scanner, /run\.conclusion === 'skipped'/);
  assert.match(scanner, /job\.conclusion === 'skipped'/);
  assert.match(scanner, /parseSkipMarker/);
  assert.match(scanner, /github-test-skips-latest\.json/);
  assert.match(scanner, /p_fingerprint: item\.fingerprint/);
  assert.match(scanner, /authority: false/);
});
