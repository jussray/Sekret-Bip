import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DESIRED_DEPLOY_COMMAND,
  buildTriggerPlan,
  reconcileWorkersBuildTrigger,
} from '../scripts/reconcile-cloudflare-workers-build-trigger.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const WORKER_TAG = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRIGGER_UUID = '11111111-2222-3333-4444-555555555555';
const COMMIT_SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const BUILD_UUID = '99999999-8888-7777-6666-555555555555';

function response(result, {ok = true, statusText = 'OK'} = {}) {
  return {
    ok,
    statusText,
    async json() {
      return ok ? {success: true, result} : {success: false, errors: [{code: 1000, message: statusText}]};
    },
  };
}

function productionTrigger({
  deployCommand = DESIRED_DEPLOY_COMMAND,
  pathIncludes = ['*'],
  pathExcludes = [],
} = {}) {
  return {
    trigger_uuid: TRIGGER_UUID,
    trigger_name: 'Deploy production',
    branch_includes: ['main'],
    branch_excludes: [],
    path_includes: pathIncludes,
    path_excludes: pathExcludes,
    deploy_command: deployCommand,
    deleted_on: null,
  };
}

test('observes normalized watch paths without planning a provider mutation', () => {
  const plan = buildTriggerPlan(
    productionTrigger({
      pathIncludes: ['*', '*', ' worker/** '],
      pathExcludes: ['.github/**', 'test/**', '.github/**'],
    }),
    null,
    DESIRED_DEPLOY_COMMAND,
  );

  assert.deepEqual(plan.pathIncludes, ['*', 'worker/**']);
  assert.deepEqual(plan.pathExcludes, ['.github/**', 'test/**']);
  assert.equal(plan.watchPathsMode, 'observe-only');
  assert.equal(plan.changeRequired, false);
  assert.equal(plan.patch, null);
});

test('dry-run receipt records production watch paths without PATCH or build request', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-watch-path-read-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const calls = [];
  const observedTrigger = productionTrigger({
    pathIncludes: ['*'],
    pathExcludes: ['.github/**', 'test/**'],
  });

  const fetchImpl = async (url, options = {}) => {
    const method = options.method || 'GET';
    calls.push({url, method, body: options.body ?? null});
    if (url.endsWith('/user/tokens/verify')) return response({status: 'active'});
    if (url.includes('/workers/scripts?')) return response([{id: 'sekret-backend', tag: WORKER_TAG}]);
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) return response([observedTrigger]);
    throw new Error(`Unexpected request: ${method} ${url}`);
  };

  const evidence = await reconcileWorkersBuildTrigger({
    env: {
      CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'secret-token-must-not-leak',
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
    },
    apply: false,
    fetchImpl,
    now: () => new Date('2026-08-17T02:15:00.000Z'),
  });

  assert.equal(evidence.schemaVersion, 8);
  assert.equal(evidence.status, 'already-correct');
  assert.equal(evidence.verified, true);
  assert.equal(evidence.desired.watchPathsMode, 'observe-only');
  assert.deepEqual(evidence.productionTrigger.pathIncludes, ['*']);
  assert.deepEqual(evidence.productionTrigger.pathExcludes, ['.github/**', 'test/**']);
  assert.deepEqual(evidence.before.pathIncludes, ['*']);
  assert.deepEqual(evidence.before.pathExcludes, ['.github/**', 'test/**']);
  assert.deepEqual(evidence.rollback.pathIncludes, ['*']);
  assert.deepEqual(evidence.rollback.pathExcludes, ['.github/**', 'test/**']);
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
  assert.equal(calls.some((call) => call.method === 'POST'), false);
  assert.doesNotMatch(fs.readFileSync(evidencePath, 'utf8'), /secret-token-must-not-leak/);
});

test('apply repairs owned fields while preserving watch paths through PATCH and readback', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-watch-path-apply-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const paths = {
    pathIncludes: ['*'],
    pathExcludes: ['.github/**', 'test/**'],
  };
  let patched = false;
  let patchBody = null;

  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/user/tokens/verify')) return response({status: 'active'});
    if (url.includes('/workers/scripts?')) return response([{id: 'sekret-backend', tag: WORKER_TAG}]);
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) {
      return response([
        productionTrigger({
          ...paths,
          deployCommand: patched ? DESIRED_DEPLOY_COMMAND : 'npx wrangler deploy',
        }),
      ]);
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}`) && options.method === 'PATCH') {
      patchBody = JSON.parse(options.body);
      patched = true;
      return response(productionTrigger(paths));
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}/builds`) && options.method === 'POST') {
      return response({build_uuid: BUILD_UUID});
    }
    throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
  };

  const evidence = await reconcileWorkersBuildTrigger({
    env: {
      CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'token',
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      BIP_WORKER_BUILD_COMMIT: COMMIT_SHA,
      CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
    },
    apply: true,
    fetchImpl,
  });

  assert.deepEqual(patchBody, {deploy_command: DESIRED_DEPLOY_COMMAND});
  assert.equal(Object.hasOwn(patchBody, 'path_includes'), false);
  assert.equal(Object.hasOwn(patchBody, 'path_excludes'), false);
  assert.deepEqual(evidence.before.pathIncludes, ['*']);
  assert.deepEqual(evidence.before.pathExcludes, ['.github/**', 'test/**']);
  assert.deepEqual(evidence.after.pathIncludes, ['*']);
  assert.deepEqual(evidence.after.pathExcludes, ['.github/**', 'test/**']);
  assert.equal(evidence.status, 'applied-and-build-requested');
  assert.equal(evidence.targetBuild.buildUuid, BUILD_UUID);
});
