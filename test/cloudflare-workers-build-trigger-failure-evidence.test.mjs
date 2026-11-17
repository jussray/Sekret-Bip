import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DESIRED_PATH_EXCLUDES,
  DESIRED_PATH_INCLUDES,
  reconcileWorkersBuildTrigger,
} from '../scripts/reconcile-cloudflare-workers-build-trigger.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const COMMIT_SHA = 'abcdef0123456789abcdef0123456789abcdef01';

function failedResponse(message = 'Authentication error') {
  return {
    ok: false,
    statusText: message,
    async json() {
      return {
        success: false,
        errors: [{ code: 10000, message }],
      };
    },
  };
}

test('retains redacted evidence when Cloudflare token verification fails before discovery', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-trigger-early-fail-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const token = 'secret-token-must-never-be-retained';

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: token,
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        BIP_WORKER_BUILD_COMMIT: COMMIT_SHA,
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        assert.match(url, /\/user\/tokens\/verify$/);
        return failedResponse();
      },
      now: () => new Date('2026-09-07T23:35:00.000Z'),
    }),
    /CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED/,
  );

  assert.equal(fs.existsSync(evidencePath), true);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);

  assert.equal(evidence.schemaVersion, 9);
  assert.equal(evidence.status, 'provider-discovery-failed');
  assert.equal(evidence.verified, false);
  assert.equal(evidence.applyRequested, false);
  assert.equal(evidence.worker.name, 'sekret-backend');
  assert.equal(evidence.worker.tag, null);
  assert.equal(evidence.productionTrigger, null);
  assert.equal(evidence.nonProductionTrigger, null);
  assert.deepEqual(evidence.desired.branchIncludes, ['main']);
  assert.deepEqual(evidence.desired.branchExcludes, []);
  assert.deepEqual(evidence.desired.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.desired.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.equal(evidence.desired.watchPathsMode, 'enforced');
  assert.equal(evidence.before.pathIncludes, null);
  assert.equal(evidence.before.pathExcludes, null);
  assert.equal(evidence.rollback.pathIncludes, null);
  assert.equal(evidence.rollback.pathExcludes, null);
  assert.equal(evidence.desired.nonProductionBuildsEnabled, false);
  assert.equal(evidence.error, 'CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED codes=10000 operation=token-verify');
  assert.doesNotMatch(evidenceText, /Authentication error|Cloudflare GET/);
  assert.doesNotMatch(evidenceText, new RegExp(token));
});

test('retains configuration evidence before any provider request when apply SHA is invalid', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-trigger-config-fail-'));
  const evidencePath = path.join(dir, 'evidence.json');
  let requests = 0;

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'secret-token',
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        GITHUB_SHA: 'deadbeef',
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      apply: true,
      fetchImpl: async () => {
        requests += 1;
        return failedResponse();
      },
    }),
    /exact 40-character Git commit SHA/,
  );

  assert.equal(requests, 0);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);
  assert.equal(evidence.schemaVersion, 9);
  assert.equal(evidence.status, 'configuration-invalid');
  assert.equal(evidence.applyRequested, true);
  assert.equal(evidence.verified, false);
  assert.equal(evidence.targetBuild.commitSha, null);
  assert.deepEqual(evidence.desired.branchIncludes, ['main']);
  assert.deepEqual(evidence.desired.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.desired.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.equal(evidence.desired.watchPathsMode, 'enforced');
  assert.equal(evidence.desired.nonProductionBuildsEnabled, false);
  assert.doesNotMatch(evidenceText, /secret-token/);
});

test('failed fallback retains only bounded provider diagnostics, not token or provider messages', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-trigger-fallback-fail-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const privateMarker = 'synthetic-private-token-and-message';
  let requests = 0;

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: privateMarker,
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        requests += 1;
        const verify = url.endsWith('/user/tokens/verify');
        assert.ok(verify || url.includes('/workers/scripts?'));
        return {
          ok: false,
          status: verify ? 403 : 502,
          statusText: privateMarker,
          async json() {
            return { success: false, errors: [{ code: verify ? 6003 : 10000, message: privateMarker }] };
          },
        };
      },
    }),
    /CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED/,
  );
  assert.equal(requests, 2);
  const evidence = fs.readFileSync(evidencePath, 'utf8');
  assert.equal(
    JSON.parse(evidence).error,
    'CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED status=502 codes=10000 operation=workers-scripts-read',
  );
  assert.doesNotMatch(evidence, /synthetic-private-token-and-message|Cloudflare GET/);
});

test('production trigger selection failures retain only a fixed classification', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-trigger-selection-fail-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const result = (value) => ({
    ok: true,
    status: 200,
    async json() { return { success: true, result: value }; },
  });

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'synthetic-token',
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        if (url.endsWith('/user/tokens/verify')) return result({ status: 'active' });
        if (url.includes('/workers/scripts?')) {
          return result([{ id: 'sekret-backend', tag: 'synthetic-worker-tag' }]);
        }
        if (url.endsWith('/builds/workers/synthetic-worker-tag/triggers')) return result([]);
        throw new Error('unexpected synthetic request');
      },
    }),
    /PRODUCTION_TRIGGER_SELECTION_FAILED/,
  );
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.error, 'PRODUCTION_TRIGGER_SELECTION_FAILED');
  assert.equal(evidence.status, 'provider-discovery-failed');
});
