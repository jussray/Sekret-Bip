import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateTestLedger,
  assertLedgerMergeReady,
  buildTestLedger,
  classifyObservation,
  githubJson,
  isRetryableGithubResponse,
  isRetryableGithubStatus,
  mapCheckState,
  selectLatestChecks,
} from '../scripts/control-room-test-ledger.mjs';

const SHA = '22a5f0ba9d55eeb97d6aaa88e876f77a97e5a440';

function check(overrides = {}) {
  return {
    id: 1,
    name: 'Repository Truth Gate',
    status: 'completed',
    conclusion: 'success',
    head_sha: SHA,
    started_at: '2026-08-04T20:00:00Z',
    completed_at: '2026-08-04T20:01:00Z',
    details_url: 'https://github.com/jussray/Sekret-Bip/actions/runs/1',
    app: {slug: 'github-actions', name: 'GitHub Actions'},
    ...overrides,
  };
}

function response(status, body = '{}', payload = {}, headers = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {get: (name) => normalizedHeaders.get(String(name).toLowerCase()) ?? null},
    text: async () => body,
    json: async () => payload,
  };
}

test('maps provider states without false green', () => {
  assert.equal(mapCheckState(check()), 'passed');
  assert.equal(mapCheckState(check({conclusion: 'skipped'})), 'skipped');
  assert.equal(mapCheckState(check({conclusion: 'neutral'})), 'skipped');
  assert.equal(mapCheckState(check({conclusion: 'failure'})), 'failed');
  assert.equal(mapCheckState(check({status: 'in_progress', conclusion: null})), 'running');
  assert.equal(mapCheckState(check({status: 'queued', conclusion: null})), 'queued');
  assert.equal(mapCheckState(check({status: 'completed', conclusion: null})), 'unknown');
});

test('keeps every latest exact-head lane and excludes the observer', () => {
  const checks = selectLatestChecks([
    check({id: 1, name: 'Repository Truth Gate', completed_at: '2026-08-04T20:01:00Z'}),
    check({id: 2, name: 'Repository Truth Gate', conclusion: 'failure', completed_at: '2026-08-04T20:02:00Z'}),
    check({id: 3, name: 'Product Design Playwright Proof'}),
    check({id: 4, name: 'Cloudflare Pages', app: {slug: 'cloudflare-pages'}}),
    check({id: 5, name: 'Publish exact-head test ledger'}),
    check({id: 6, name: 'Foreign SHA', head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'}),
  ], SHA, 'Publish exact-head test ledger');

  assert.deepEqual(checks.map((item) => item.name), [
    'Cloudflare Pages',
    'Product Design Playwright Proof',
    'Repository Truth Gate',
  ]);
  assert.equal(checks.find((item) => item.name === 'Repository Truth Gate')?.state, 'failed');
  assert.equal(checks.every((item) => item.headSha === SHA), true);
});

test('aggregates failed, pending, warning, unknown, and passed distinctly', () => {
  assert.equal(aggregateTestLedger([]).state, 'unknown');
  assert.equal(aggregateTestLedger([{state: 'passed'}]).state, 'passed');
  assert.equal(aggregateTestLedger([{state: 'passed'}, {state: 'skipped'}]).state, 'warning');
  assert.equal(aggregateTestLedger([{state: 'running'}]).state, 'pending');
  assert.equal(aggregateTestLedger([{state: 'failed'}, {state: 'passed'}]).state, 'failed');
});

test('observation stops on a repeated decisive failure even when another check is still running', () => {
  const checks = [{name: 'Supabase Preview', state: 'failed'}, {name: 'Production Witness', state: 'running'}];
  const fingerprint = JSON.stringify(checks.map((item) => ['github-actions', item.name, item.state]));

  assert.equal(classifyObservation({
    checks,
    oldEnough: true,
    fingerprint,
    previousFingerprint: fingerprint,
  }), 'decisive-failure');
  assert.equal(classifyObservation({
    checks,
    oldEnough: false,
    fingerprint,
    previousFingerprint: fingerprint,
  }), 'observing');
});

test('observation requires all checks terminal before declaring stable success', () => {
  const running = [{name: 'Playwright', state: 'running'}];
  const runningFingerprint = JSON.stringify(running.map((item) => ['github-actions', item.name, item.state]));
  assert.equal(classifyObservation({
    checks: running,
    oldEnough: true,
    fingerprint: runningFingerprint,
    previousFingerprint: runningFingerprint,
  }), 'observing');

  const passed = [{name: 'Playwright', state: 'passed'}];
  const passedFingerprint = JSON.stringify(passed.map((item) => ['github-actions', item.name, item.state]));
  assert.equal(classifyObservation({
    checks: passed,
    oldEnough: true,
    fingerprint: passedFingerprint,
    previousFingerprint: passedFingerprint,
  }), 'stable');
});

test('builds a sanitized exact-SHA repository-local ledger', () => {
  const checks = selectLatestChecks([check()], SHA);
  const ledger = buildTestLedger({
    repository: 'jussray/Sekret-Bip',
    sha: SHA.toUpperCase(),
    branch: 'main',
    runId: '30950000000',
    checks,
    observedAt: new Date('2026-08-04T20:05:00Z'),
  });

  assert.equal(ledger.commitSha, SHA);
  assert.equal(ledger.aggregate.state, 'passed');
  assert.equal(ledger.source.includesAllDiscoveredChecks, true);
  assert.equal(ledger.source.excludesObserverCheck, true);
  assert.equal(JSON.stringify(ledger).includes('token'), false);
});

test('fails closed when the observation window expires with a running exact-head check and no decisive failure', () => {
  const checks = selectLatestChecks([
    check({name: 'Cloudflare Pages', status: 'in_progress', conclusion: null}),
  ], SHA);
  const ledger = buildTestLedger({
    repository: 'jussray/Sekret-Bip',
    sha: SHA,
    branch: 'fix/ledger-authority',
    runId: '31984861035',
    checks,
    observerState: 'window-expired',
  });

  assert.equal(ledger.aggregate.state, 'pending');
  assert.throws(
    () => assertLedgerMergeReady(ledger, 'artifacts/test-ledger.json'),
    /did not reach a stable terminal state/,
  );
});

test('reports decisive exact-head failures before generic observation timeout state', () => {
  const checks = selectLatestChecks([
    check({name: 'Supabase Preview', conclusion: 'failure'}),
    check({id: 2, name: 'Production Witness', status: 'in_progress', conclusion: null}),
  ], SHA);
  const ledger = buildTestLedger({
    repository: 'jussray/Sekret-Bip',
    sha: SHA,
    branch: 'main',
    runId: '31984861035',
    checks,
    observerState: 'decisive-failure',
  });

  assert.equal(ledger.aggregate.state, 'failed');
  assert.throws(
    () => assertLedgerMergeReady(ledger),
    /Exact-head check failures remain/,
  );
});

test('fails closed when a stable terminal exact-head check failed', () => {
  const checks = selectLatestChecks([
    check({name: 'Repository Truth Gate', conclusion: 'failure'}),
  ], SHA);
  const ledger = buildTestLedger({
    repository: 'jussray/Sekret-Bip',
    sha: SHA,
    branch: 'main',
    runId: '31984861035',
    checks,
    observerState: 'stable',
  });

  assert.equal(ledger.aggregate.state, 'failed');
  assert.throws(
    () => assertLedgerMergeReady(ledger),
    /Exact-head check failures remain/,
  );
});

test('allows stable terminal success with intentionally skipped checks', () => {
  const checks = selectLatestChecks([
    check({name: 'Repository Truth Gate'}),
    check({id: 2, name: 'Supabase Preview', conclusion: 'skipped'}),
  ], SHA);
  const ledger = buildTestLedger({
    repository: 'jussray/Sekret-Bip',
    sha: SHA,
    branch: 'main',
    runId: '31984861035',
    checks,
    observerState: 'stable',
  });

  assert.equal(ledger.aggregate.state, 'warning');
  assert.equal(assertLedgerMergeReady(ledger), ledger);
});

test('classifies only evidenced 403 rate limits as retryable', () => {
  assert.equal(isRetryableGithubStatus(502), true);
  assert.equal(isRetryableGithubStatus(401), false);
  assert.equal(isRetryableGithubResponse(response(403, '{}', {}, {'retry-after': '2'})), true);
  assert.equal(isRetryableGithubResponse(response(403, '{}', {}, {'x-ratelimit-remaining': '0'})), true);
  assert.equal(isRetryableGithubResponse(response(403, '{}')), false);
});

test('retries transient GitHub provider errors and returns the recovered payload', async () => {
  let calls = 0;
  const delays = [];
  const payload = await githubJson('https://api.github.test/check-runs', 'redacted-token', {
    maxAttempts: 4,
    baseDelayMs: 10,
    sleepImpl: async (delay) => delays.push(delay),
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return response(502, '{"message":"Server Error"}');
      return response(200, '{}', {check_runs: [{id: 1}]});
    },
  });

  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.deepEqual(payload, {check_runs: [{id: 1}]});
});

test('retries a rate-limited 403 without retrying ordinary authorization 403s', async () => {
  let rateLimitedCalls = 0;
  const rateLimitedDelays = [];
  const payload = await githubJson('https://api.github.test/check-runs', 'redacted-token', {
    maxAttempts: 3,
    baseDelayMs: 10,
    maxDelayMs: 5_000,
    sleepImpl: async (delay) => rateLimitedDelays.push(delay),
    fetchImpl: async () => {
      rateLimitedCalls += 1;
      if (rateLimitedCalls === 1) {
        return response(403, '{"message":"secondary rate limit"}', {}, {'retry-after': '2'});
      }
      return response(200, '{}', {check_runs: []});
    },
  });

  assert.equal(rateLimitedCalls, 2);
  assert.deepEqual(rateLimitedDelays, [2_000]);
  assert.deepEqual(payload, {check_runs: []});

  let authCalls = 0;
  await assert.rejects(
    githubJson('https://api.github.test/check-runs', 'redacted-token', {
      maxAttempts: 3,
      baseDelayMs: 10,
      sleepImpl: async () => assert.fail('ordinary 403 must not sleep/retry'),
      fetchImpl: async () => {
        authCalls += 1;
        return response(403, '{"message":"Resource not accessible by integration"}');
      },
    }),
    /GitHub check lookup failed \(403\) after 1 attempt\(s\)/,
  );
  assert.equal(authCalls, 1);
});

test('retries when a successful response body fails during JSON consumption', async () => {
  let calls = 0;
  const delays = [];
  const payload = await githubJson('https://api.github.test/check-runs', 'redacted-token', {
    maxAttempts: 3,
    baseDelayMs: 10,
    sleepImpl: async (delay) => delays.push(delay),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ...response(200),
          json: async () => { throw new Error('socket closed while reading body'); },
        };
      }
      return response(200, '{}', {check_runs: [{id: 2}]});
    },
  });

  assert.equal(calls, 2);
  assert.deepEqual(delays, [10]);
  assert.deepEqual(payload, {check_runs: [{id: 2}]});
});

test('retries when an error response body fails during text consumption', async () => {
  let calls = 0;
  const delays = [];
  const payload = await githubJson('https://api.github.test/check-runs', 'redacted-token', {
    maxAttempts: 3,
    baseDelayMs: 10,
    sleepImpl: async (delay) => delays.push(delay),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ...response(502),
          text: async () => { throw new Error('socket closed while reading error body'); },
        };
      }
      return response(200, '{}', {check_runs: [{id: 3}]});
    },
  });

  assert.equal(calls, 2);
  assert.deepEqual(delays, [10]);
  assert.deepEqual(payload, {check_runs: [{id: 3}]});
});

test('does not retry non-transient authentication failures', async () => {
  let calls = 0;
  const delays = [];

  await assert.rejects(
    githubJson('https://api.github.test/check-runs', 'redacted-token', {
      maxAttempts: 4,
      baseDelayMs: 10,
      sleepImpl: async (delay) => delays.push(delay),
      fetchImpl: async () => {
        calls += 1;
        return response(401, '{"message":"Bad credentials"}');
      },
    }),
    /GitHub check lookup failed \(401\) after 1 attempt\(s\)/,
  );

  assert.equal(calls, 1);
  assert.deepEqual(delays, []);
});

test('bounded retries still fail closed when transient provider errors persist', async () => {
  let calls = 0;
  const delays = [];

  await assert.rejects(
    githubJson('https://api.github.test/check-runs', 'redacted-token', {
      maxAttempts: 3,
      baseDelayMs: 5,
      sleepImpl: async (delay) => delays.push(delay),
      fetchImpl: async () => {
        calls += 1;
        return response(502, '{"message":"Server Error"}');
      },
    }),
    /GitHub check lookup failed \(502\) after 3 attempt\(s\)/,
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [5, 10]);
});
