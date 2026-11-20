import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DESIRED_BUILD_COMMAND,
  DESIRED_DEPLOY_COMMAND,
  reconcileWorkersBuildTrigger,
} from '../scripts/reconcile-cloudflare-workers-build-trigger.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const WORKER_TAG = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRIGGER_UUID = '11111111-2222-3333-4444-555555555555';
const COMMIT_SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const BUILD_UUID = '99999999-8888-7777-6666-555555555555';

function response(result, { ok = true, statusText = 'OK' } = {}) {
  return {
    ok,
    statusText,
    async json() {
      return ok
        ? { success: true, result }
        : { success: false, errors: [{ code: 1000, message: statusText }] };
    },
  };
}

function productionTrigger({
  buildCommand = 'node scripts/write-worker-release-identity.mjs',
  deployCommand = 'npx wrangler deploy',
} = {}) {
  return {
    trigger_uuid: TRIGGER_UUID,
    trigger_name: 'Deploy production',
    branch_includes: ['main'],
    branch_excludes: [],
    build_command: buildCommand,
    deploy_command: deployCommand,
    deleted_on: null,
  };
}

test('keeps Workers build phase non-mutating and delegates exact SHA stamping to the deploy wrapper', async () => {
  const deployWrapper = fs.readFileSync(
    new URL('../scripts/deploy-cloudflare-worker.mjs', import.meta.url),
    'utf8',
  );
  const cleanCheck = deployWrapper.indexOf('const sha = resolveDeployCommitSha');
  const identityStamp = deployWrapper.indexOf('const stampedSha = normalizeCommitSha(writeIdentity');
  assert.ok(cleanCheck >= 0 && identityStamp > cleanCheck);
  assert.match(deployWrapper, /WORKERS_CI_COMMIT_SHA: sha/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-release-identity-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const token = 'secret-token-must-not-leak';
  let trigger = productionTrigger();
  let patchCalls = 0;
  let buildCalls = 0;

  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/user/tokens/verify')) return response({ status: 'active' });
    if (url.includes('/workers/scripts?')) {
      return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
    }
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) {
      return response([trigger]);
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}`) && options.method === 'PATCH') {
      patchCalls += 1;
      const patch = JSON.parse(options.body);
      assert.deepEqual(patch, {
        build_command: DESIRED_BUILD_COMMAND,
        deploy_command: DESIRED_DEPLOY_COMMAND,
      });
      trigger = {
        ...trigger,
        build_command: patch.build_command,
        deploy_command: patch.deploy_command,
      };
      return response(trigger);
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}/builds`) && options.method === 'POST') {
      buildCalls += 1;
      assert.deepEqual(JSON.parse(options.body), {
        branch: 'main',
        commit_hash: COMMIT_SHA,
      });
      return response({ build_uuid: BUILD_UUID });
    }
    throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
  };

  const evidence = await reconcileWorkersBuildTrigger({
    env: {
      CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      BIP_WORKER_NAME: 'sekret-backend',
      BIP_WORKER_BUILD_COMMAND: DESIRED_BUILD_COMMAND,
      BIP_WORKER_DEPLOY_COMMAND: DESIRED_DEPLOY_COMMAND,
      BIP_WORKER_BUILD_COMMIT: COMMIT_SHA,
      CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
    },
    apply: true,
    fetchImpl,
    now: () => new Date('2026-08-14T02:30:00.000Z'),
  });

  assert.equal(evidence.status, 'applied-and-build-requested');
  assert.equal(evidence.applied, true);
  assert.equal(evidence.triggerVerified, true);
  assert.equal(evidence.verified, true);
  assert.equal(evidence.before.buildCommand, 'node scripts/write-worker-release-identity.mjs');
  assert.equal(evidence.before.deployCommand, 'npx wrangler deploy');
  assert.equal(evidence.desired.buildCommand, DESIRED_BUILD_COMMAND);
  assert.equal(evidence.after.buildCommand, DESIRED_BUILD_COMMAND);
  assert.equal(evidence.after.deployCommand, DESIRED_DEPLOY_COMMAND);
  assert.equal(evidence.targetBuild.commitSha, COMMIT_SHA);
  assert.equal(evidence.targetBuild.buildUuid, BUILD_UUID);
  assert.equal(patchCalls, 1);
  assert.equal(buildCalls, 1);

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.match(retained, new RegExp(COMMIT_SHA));
  assert.doesNotMatch(retained, new RegExp(token));
});
