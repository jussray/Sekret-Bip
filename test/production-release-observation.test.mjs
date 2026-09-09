import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  RELEASE_BLOCKER_MARKER,
  RELEASE_OBSERVATION_MARKER,
  buildReleaseBlockerComment,
  buildReleaseObservationComment,
  upsertReleaseObservation,
  validateReleaseEvidence,
} from '../scripts/publish-production-release-observation.mjs';

const SHA = '22a5f0ba9d55eeb97d6aaa88e876f77a97e5a440';
const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8');

function releaseEvidence(overrides = {}) {
  return {
    version: 5,
    repository: 'jussray/Sekret-Bip',
    commitSha: SHA,
    expectedSha: SHA,
    status: 'succeeded',
    complete: true,
    verifiedAt: '2026-08-04T20:00:00.000Z',
    readinessState: 'ready',
    checkSummary: {missing: [], pending: [], failed: [], unsuccessful: []},
    requiredChecks: {
      'Workers Builds: sekret-backend': {
        name: 'Workers Builds: sekret-backend',
        status: 'completed',
        conclusion: 'success',
      },
    },
    pagesRelease: {
      url: 'https://sekretbip.net/.well-known/sekret-release.json',
      commitSha: SHA,
      expectedSha: SHA,
      complete: true,
      marker: {
        environment: 'production',
        branch: 'main',
        deploymentProvider: 'cloudflare-pages',
        deploymentId: 'deployment-123',
      },
    },
    workerRuntime: {
      url: 'https://api.sekretbip.net/health',
      expectedSha: SHA,
      releaseSha: SHA,
      versionId: 'worker-version-123',
      versionTag: 'provider-tag-is-metadata',
      versionTimestamp: '2026-08-04T19:59:00.000Z',
      healthOk: true,
      complete: true,
    },
    ...overrides,
  };
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

test('accepts only complete exact-SHA v5 production evidence', () => {
  const result = validateReleaseEvidence(releaseEvidence(), SHA.toUpperCase());
  assert.equal(result.expectedSha, SHA);
  assert.equal(result.pagesRelease.complete, true);
  assert.equal(result.workerRuntime.complete, true);
  assert.equal(result.workerRuntime.releaseSha, SHA);
});

test('rejects legacy v4 release evidence even when it otherwise looks complete', () => {
  assert.throws(
    () => validateReleaseEvidence(releaseEvidence({version: 4}), SHA),
    /Release evidence version 5 is required/,
  );
});

test('rejects stale Pages release evidence', () => {
  assert.throws(
    () => validateReleaseEvidence(
      releaseEvidence({
        pagesRelease: {
          ...releaseEvidence().pagesRelease,
          commitSha: '1dba83386eb0a0865d051f2c74ae9046dafb5eeb',
        },
      }),
      SHA,
    ),
    /Pages release marker is not exact/,
  );
});

test('rejects missing Worker runtime evidence', () => {
  assert.throws(
    () => validateReleaseEvidence(releaseEvidence({workerRuntime: null}), SHA),
    /Worker runtime evidence must be an object/,
  );
});

test('rejects stale Worker runtime SHA even when provider metadata matches', () => {
  assert.throws(
    () => validateReleaseEvidence(
      releaseEvidence({
        workerRuntime: {
          ...releaseEvidence().workerRuntime,
          releaseSha: '1dba83386eb0a0865d051f2c74ae9046dafb5eeb',
          versionTag: SHA,
        },
      }),
      SHA,
    ),
    /Worker runtime identity is not exact/,
  );
});

test('accepts exact Worker runtime SHA without provider version metadata', () => {
  const evidence = releaseEvidence({
    workerRuntime: {
      ...releaseEvidence().workerRuntime,
      versionId: null,
      versionTag: null,
      versionTimestamp: null,
    },
  });
  const result = validateReleaseEvidence(evidence, SHA);
  assert.equal(result.workerRuntime.releaseSha, SHA);
  assert.equal(result.workerRuntime.versionId, null);
  assert.equal(result.workerRuntime.versionTag, null);
});

test('rejects incomplete Worker deployment check evidence', () => {
  assert.throws(
    () => validateReleaseEvidence(
      releaseEvidence({
        requiredChecks: {
          'Workers Builds: sekret-backend': {
            status: 'completed',
            conclusion: 'failure',
          },
        },
      }),
      SHA,
    ),
    /Required Cloudflare checks are not successful/,
  );
});

test('builds an immutable exact-release receipt with authoritative Worker SHA', () => {
  const comment = buildReleaseObservationComment({
    evidence: releaseEvidence(),
    expectedSha: SHA,
    repository: 'jussray/Sekret-Bip',
    runId: '30779990000',
  });

  assert.match(comment, new RegExp(RELEASE_OBSERVATION_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(comment, new RegExp(SHA));
  assert.match(comment, /Pages branch: `main`/);
  assert.ok(comment.includes('Worker release SHA: `' + SHA + '`'));
  assert.match(comment, /Worker version ID: `worker-version-123`/);
  assert.match(comment, /Worker version tag: `provider-tag-is-metadata`/);
  assert.match(comment, /Backend health: `passed`/);
  assert.match(comment, /Production Playwright: `passed`/);
  assert.match(comment, /provenance only/);
  assert.match(comment, /actions\/runs\/30779990000/);
});

test('builds a separate blocked receipt without claiming verification', () => {
  const staleSha = '1dba83386eb0a0865d051f2c74ae9046dafb5eeb';
  const comment = buildReleaseBlockerComment({
    evidence: releaseEvidence({
      status: 'timed-out',
      complete: false,
      readinessState: 'worker-release-sha-stale',
      verifiedAt: null,
      checkSummary: {missing: [], pending: [], failed: [], unsuccessful: []},
      pagesRelease: {
        ...releaseEvidence().pagesRelease,
        commitSha: staleSha,
        complete: false,
      },
      workerRuntime: {
        ...releaseEvidence().workerRuntime,
        releaseSha: staleSha,
        complete: false,
      },
    }),
    expectedSha: SHA,
    repository: 'jussray/Sekret-Bip',
    runId: '30779990001',
    stepOutcomes: {cloudflare_release: 'failure', backend_health: 'skipped'},
  });

  assert.match(comment, new RegExp(RELEASE_BLOCKER_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(comment, /## BLOCKED:/);
  assert.match(comment, /worker-release-sha-stale/);
  assert.match(comment, /Evidence version: `5`/);
  assert.match(comment, new RegExp(staleSha));
  assert.match(comment, /Worker release exact: `no`/);
  assert.match(comment, /cloudflare_release: `failure`/);
  assert.match(comment, /not a production pass/);
  assert.doesNotMatch(comment, /## VERIFIED:/);
});

test('updates the existing marked release receipt instead of duplicating it', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({url, options});
    if (String(url).includes('?per_page=100')) {
      return jsonResponse([{id: 42, body: `${RELEASE_OBSERVATION_MARKER}\nold`}]);
    }
    return jsonResponse({id: 42});
  };

  const result = await upsertReleaseObservation({
    fetchImpl,
    token: 'test-token',
    repository: 'jussray/Sekret-Bip',
    issueNumber: 696,
    comment: `${RELEASE_OBSERVATION_MARKER}\nnew`,
  });

  assert.deepEqual(result, {action: 'updated', commentId: 42});
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'PATCH');
  assert.match(calls[1].url, /issues\/comments\/42$/);
});

test('updates the blocker marker without overwriting the verified receipt', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({url, options});
    if (String(url).includes('?per_page=100')) {
      return jsonResponse([
        {id: 42, body: `${RELEASE_OBSERVATION_MARKER}\nverified`},
        {id: 43, body: `${RELEASE_BLOCKER_MARKER}\nold blocker`},
      ]);
    }
    return jsonResponse({id: 43});
  };

  const result = await upsertReleaseObservation({
    fetchImpl,
    token: 'test-token',
    repository: 'jussray/Sekret-Bip',
    issueNumber: 696,
    comment: `${RELEASE_BLOCKER_MARKER}\nnew blocker`,
    marker: RELEASE_BLOCKER_MARKER,
  });

  assert.deepEqual(result, {action: 'updated', commentId: 43});
  assert.match(calls[1].url, /issues\/comments\/43$/);
});

test('creates the first marked release receipt when none exists', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({url, options});
    if (String(url).includes('?per_page=100')) return jsonResponse([]);
    return jsonResponse({id: 84}, 201);
  };

  const result = await upsertReleaseObservation({
    fetchImpl,
    token: 'test-token',
    repository: 'jussray/Sekret-Bip',
    issueNumber: 696,
    comment: `${RELEASE_OBSERVATION_MARKER}\nfirst`,
  });

  assert.deepEqual(result, {action: 'created', commentId: 84});
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
  assert.match(calls[1].url, /issues\/696\/comments$/);
});

test('production workflow publishes blocked attempts after retaining evidence', () => {
  assert.match(workflow, /id: cloudflare_release/);
  assert.match(workflow, /id: backend_health/);
  assert.match(workflow, /id: supabase_health/);
  assert.match(workflow, /id: production_playwright/);
  assert.match(workflow, /Publish blocked exact production observation/);
  assert.match(workflow, /if: failure\(\)/);
  assert.match(workflow, /RELEASE_OBSERVATION_MODE: blocked/);
  assert.match(workflow, /RELEASE_STEP_OUTCOMES:/);
});
