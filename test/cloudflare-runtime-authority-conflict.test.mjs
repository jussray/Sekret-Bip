import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCloudflareEvidence,
  classifyCloudflareReadiness,
  evaluateCloudflareChecks,
  evaluateCloudflareDeploymentCompletion,
  evaluateReleaseMarker,
  evaluateWorkerRuntime,
} from '../scripts/verify-cloudflare-native-deploy.mjs';

const expectedSha = '6ee153cf5444b80fcdbaafd507fe2e2b5f2dd2c1';
const workerCheckFailure = [{
  name: 'Workers Builds: sekret-backend',
  status: 'completed',
  conclusion: 'failure',
  started_at: '2026-08-29T05:38:49Z',
  completed_at: '2026-08-29T05:39:10Z',
  details_url: 'https://example.invalid/check',
  html_url: 'https://example.invalid/check',
  external_id: 'worker-build-1',
}];

function exactRelease() {
  return evaluateReleaseMarker({commitSha: expectedSha}, expectedSha);
}

function exactRuntime() {
  return evaluateWorkerRuntime({
    ok: true,
    releaseSha: expectedSha,
    version: {
      id: '2339b728-64b2-4631-b1b4-8a6b51ebc969',
      timestamp: '2026-08-29T05:38:51.641649Z',
    },
  }, expectedSha);
}

test('a terminal provider failure does not outrank exact live Worker runtime identity', () => {
  const checks = evaluateCloudflareChecks(workerCheckFailure);
  const release = exactRelease();
  const runtime = exactRuntime();
  const completion = evaluateCloudflareDeploymentCompletion(checks, release, runtime);

  assert.deepEqual(checks.failed, ['Workers Builds: sekret-backend']);
  assert.equal(runtime.complete, true);
  assert.equal(completion.complete, true);
  assert.equal(completion.providerCheckConflict, true);
  assert.equal(classifyCloudflareReadiness(checks, release, runtime), 'ready-with-provider-check-conflict');
});

test('the conflicting provider check remains visible in durable evidence', () => {
  const checks = evaluateCloudflareChecks(workerCheckFailure);
  const release = exactRelease();
  const runtime = exactRuntime();
  const observedAtMs = Date.parse('2026-08-29T05:39:11Z');

  const evidence = buildCloudflareEvidence({
    repository: 'jussray/Sekret-Bip',
    sha: expectedSha,
    releaseUrl: 'https://app.sekretbip.net/.well-known/sekret-release.json',
    backendHealthUrl: 'https://api.sekretbip.net/health',
    checkEvaluation: checks,
    releaseEvaluation: release,
    workerEvaluation: runtime,
    allCheckRuns: workerCheckFailure,
    startedAtMs: observedAtMs - 30_000,
    observedAtMs,
    status: 'succeeded',
  });

  assert.equal(evidence.complete, true);
  assert.equal(evidence.providerCheckConflict, true);
  assert.equal(evidence.readinessState, 'ready-with-provider-check-conflict');
  assert.deepEqual(evidence.checkSummary.failed, ['Workers Builds: sekret-backend']);
  assert.equal(evidence.workerRuntime.releaseSha, expectedSha);
  assert.equal(evidence.workerRuntime.complete, true);
});

test('a failed provider check still blocks while live runtime has not reached the target SHA', () => {
  const checks = evaluateCloudflareChecks(workerCheckFailure);
  const release = exactRelease();
  const runtime = evaluateWorkerRuntime({
    ok: true,
    releaseSha: '68766af4c1f2231a248a485fbbb4637aa882661d',
  }, expectedSha);
  const completion = evaluateCloudflareDeploymentCompletion(checks, release, runtime);

  assert.equal(completion.complete, false);
  assert.equal(completion.providerCheckConflict, false);
  assert.equal(classifyCloudflareReadiness(checks, release, runtime), 'worker-failed-awaiting-runtime');
});

test('missing or pending native Worker checks still fail closed even when runtime is exact', () => {
  const release = exactRelease();
  const runtime = exactRuntime();

  const missing = evaluateCloudflareChecks([]);
  assert.equal(evaluateCloudflareDeploymentCompletion(missing, release, runtime).complete, false);
  assert.equal(classifyCloudflareReadiness(missing, release, runtime), 'worker-missing');

  const pending = evaluateCloudflareChecks([{
    ...workerCheckFailure[0],
    status: 'in_progress',
    conclusion: null,
  }]);
  assert.equal(evaluateCloudflareDeploymentCompletion(pending, release, runtime).complete, false);
  assert.equal(classifyCloudflareReadiness(pending, release, runtime), 'worker-pending');
});

test('frontend release identity remains mandatory even when runtime is exact', () => {
  const checks = evaluateCloudflareChecks(workerCheckFailure);
  const release = evaluateReleaseMarker(null, expectedSha);
  const runtime = exactRuntime();

  assert.equal(evaluateCloudflareDeploymentCompletion(checks, release, runtime).complete, false);
  assert.equal(classifyCloudflareReadiness(checks, release, runtime), 'pages-marker-missing');
});
