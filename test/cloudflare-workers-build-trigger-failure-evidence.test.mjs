import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { reconcileWorkersBuildTrigger } from '../scripts/reconcile-cloudflare-workers-build-trigger.mjs';

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
      now: () => new Date('2026-08-11T17:40:00.000Z'),
    }),
    /Authentication error/,
  );

  assert.equal(fs.existsSync(evidencePath), true);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);

  assert.equal(evidence.schemaVersion, 8);
  assert.equal(evidence.status, 'provider-discovery-failed');
  assert.equal(evidence.verified, false);
  assert.equal(evidence.applyRequested, false);
  assert.equal(evidence.worker.name, 'sekret-backend');
  assert.equal(evidence.worker.tag, null);
  assert.equal(evidence.productionTrigger, null);
  assert.equal(evidence.nonProductionTrigger, null);
  assert.deepEqual(evidence.desired.branchIncludes, ['main']);
  assert.deepEqual(evidence.desired.branchExcludes, []);
  assert.equal(evidence.desired.watchPathsMode, 'observe-only');
  assert.equal(evidence.before.pathIncludes, null);
  assert.equal(evidence.before.pathExcludes, null);
  assert.equal(evidence.rollback.pathIncludes, null);
  assert.equal(evidence.rollback.pathExcludes, null);
  assert.equal(evidence.desired.nonProductionBuildsEnabled, false);
  assert.match(evidence.error, /Cloudflare GET \/user\/tokens\/verify failed/);
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
  assert.equal(evidence.schemaVersion, 8);
  assert.equal(evidence.status, 'configuration-invalid');
  assert.equal(evidence.applyRequested, true);
  assert.equal(evidence.verified, false);
  assert.equal(evidence.targetBuild.commitSha, null);
  assert.deepEqual(evidence.desired.branchIncludes, ['main']);
  assert.equal(evidence.desired.watchPathsMode, 'observe-only');
  assert.equal(evidence.desired.nonProductionBuildsEnabled, false);
  assert.doesNotMatch(evidenceText, /secret-token/);
});
