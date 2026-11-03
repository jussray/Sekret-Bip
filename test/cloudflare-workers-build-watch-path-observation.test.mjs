import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DESIRED_DEPLOY_COMMAND,
  DESIRED_PATH_EXCLUDES,
  DESIRED_PATH_INCLUDES,
  buildTriggerPlan,
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

test('normalizes provider watch paths and plans the repo-owned cost policy', () => {
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
  assert.deepEqual(plan.desiredPathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(plan.desiredPathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.equal(plan.watchPathsMode, 'enforced');
  assert.equal(plan.changeRequired, true);
  assert.deepEqual(plan.patch, {
    path_includes: [...DESIRED_PATH_INCLUDES],
    path_excludes: [...DESIRED_PATH_EXCLUDES],
  });
});

test('dry-run receipt verifies an already-correct watch-path cost guard without PATCH or build request', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-watch-path-read-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const calls = [];
  const observedTrigger = productionTrigger({
    pathIncludes: [...DESIRED_PATH_INCLUDES],
    pathExcludes: [...DESIRED_PATH_EXCLUDES],
  });

  const fetchImpl = async (url, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ url, method, body: options.body ?? null });
    if (url.endsWith('/user/tokens/verify')) return response({ status: 'active' });
    if (url.includes('/workers/scripts?')) return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
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
    now: () => new Date('2026-09-07T23:30:00.000Z'),
  });

  assert.equal(evidence.schemaVersion, 9);
  assert.equal(evidence.status, 'already-correct');
  assert.equal(evidence.verified, true);
  assert.equal(evidence.desired.watchPathsMode, 'enforced');
  assert.deepEqual(evidence.desired.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.desired.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.deepEqual(evidence.before.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.before.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.deepEqual(evidence.rollback.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.rollback.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
  assert.equal(calls.some((call) => call.method === 'POST'), false);
  assert.doesNotMatch(fs.readFileSync(evidencePath, 'utf8'), /secret-token-must-not-leak/);
});

test('apply repairs deploy and watch paths, verifies readback, then requests the exact build', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-watch-path-apply-'));
  const evidencePath = path.join(dir, 'evidence.json');
  let state = productionTrigger({
    deployCommand: 'npx wrangler deploy',
    pathIncludes: ['*'],
    pathExcludes: ['.github/**', 'test/**'],
  });
  const patches = [];

  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/user/tokens/verify')) return response({ status: 'active' });
    if (url.includes('/workers/scripts?')) return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) return response([state]);
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}`) && options.method === 'PATCH') {
      const patchBody = JSON.parse(options.body);
      patches.push(patchBody);
      state = { ...state, ...patchBody };
      return response(state);
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}/builds`) && options.method === 'POST') {
      assert.deepEqual(JSON.parse(options.body), { branch: 'main', commit_hash: COMMIT_SHA });
      return response({ build_uuid: BUILD_UUID });
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

  assert.deepEqual(patches[0], {
    path_excludes: [...DESIRED_PATH_EXCLUDES],
    deploy_command: DESIRED_DEPLOY_COMMAND,
  });
  assert.deepEqual(evidence.before.pathIncludes, ['*']);
  assert.deepEqual(evidence.before.pathExcludes, ['.github/**', 'test/**']);
  assert.deepEqual(evidence.after.pathIncludes, [...DESIRED_PATH_INCLUDES]);
  assert.deepEqual(evidence.after.pathExcludes, [...DESIRED_PATH_EXCLUDES]);
  assert.equal(evidence.status, 'applied-and-build-requested');
  assert.equal(evidence.targetBuild.buildUuid, BUILD_UUID);
});

test('verification failure rolls watch paths back to the exact provider before-state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-watch-path-rollback-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const original = productionTrigger({
    deployCommand: 'npx wrangler deploy',
    pathIncludes: ['*'],
    pathExcludes: ['docs/**'],
  });
  let state = original;
  const patches = [];
  let readsAfterMutation = 0;

  const fetchImpl = async (url, options = {}) => {
    if (url.endsWith('/user/tokens/verify')) return response({ status: 'active' });
    if (url.includes('/workers/scripts?')) return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) {
      if (patches.length === 1) {
        readsAfterMutation += 1;
        return response([{ ...state, path_excludes: ['provider-drift/**'] }]);
      }
      return response([state]);
    }
    if (url.endsWith(`/builds/triggers/${TRIGGER_UUID}`) && options.method === 'PATCH') {
      const patchBody = JSON.parse(options.body);
      patches.push(patchBody);
      state = { ...state, ...patchBody };
      return response(state);
    }
    throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
  };

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'token',
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        BIP_WORKER_BUILD_COMMIT: COMMIT_SHA,
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      apply: true,
      fetchImpl,
    }),
    /WATCH_PATH_READBACK_MISMATCH/,
  );

  assert.equal(readsAfterMutation, 1);
  assert.deepEqual(patches[1], {
    path_excludes: ['docs/**'],
    deploy_command: 'npx wrangler deploy',
  });
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.rollback.attempted, true);
  assert.equal(evidence.rollback.succeeded, true);
});
