import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { reconcileWorkersBuildTrigger } from '../scripts/reconcile-cloudflare-workers-build-trigger.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const WORKER_TAG = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRIGGER_UUID = '11111111-2222-3333-4444-555555555555';
const DESIRED_DEPLOY_COMMAND = 'npm run deploy:api:production';

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

function productionTrigger() {
  return {
    trigger_uuid: TRIGGER_UUID,
    trigger_name: 'Deploy production',
    branch_includes: ['main'],
    branch_excludes: [],
    deploy_command: DESIRED_DEPLOY_COMMAND,
    deleted_on: null,
  };
}

test('falls back to the general Cloudflare token when the dedicated Builds token is stale', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-token-fallback-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const staleToken = 'stale-dedicated-token';
  const fallbackToken = 'active-general-token';
  const verificationTokens = [];
  const providerTokens = [];

  const fetchImpl = async (url, options = {}) => {
    const authorization = options.headers?.Authorization ?? '';
    const token = authorization.replace(/^Bearer /, '');

    if (url.endsWith('/user/tokens/verify')) {
      verificationTokens.push(token);
      if (token === staleToken) {
        return response(null, { ok: false, statusText: 'Invalid API Token' });
      }
      if (token === fallbackToken) return response({ status: 'active' });
    }

    providerTokens.push(token);
    assert.equal(token, fallbackToken);

    if (url.includes('/workers/scripts?')) {
      return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
    }
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) {
      return response([productionTrigger()]);
    }
    throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
  };

  const evidence = await reconcileWorkersBuildTrigger({
    env: {
      CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: staleToken,
      CLOUDFLARE_API_TOKEN: fallbackToken,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
    },
    apply: false,
    fetchImpl,
    now: () => new Date('2026-08-14T01:45:00.000Z'),
  });

  assert.deepEqual(verificationTokens, [staleToken, fallbackToken]);
  assert.ok(providerTokens.length >= 2);
  assert.equal(evidence.credential.selectedSource, 'CLOUDFLARE_API_TOKEN');
  assert.equal(evidence.status, 'already-correct');
  assert.equal(evidence.triggerVerified, true);
  assert.equal(evidence.verified, true);

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, new RegExp(staleToken));
  assert.doesNotMatch(retained, new RegExp(fallbackToken));
});

test('uses exact Workers Builds read capability when token verify returns provider code 6003', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-token-capability-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const dedicatedToken = 'capability-proven-dedicated-token';
  const verificationTokens = [];
  const providerTokens = [];
  const providerUrls = [];

  const fetchImpl = async (url, options = {}) => {
    const authorization = options.headers?.Authorization ?? '';
    const token = authorization.replace(/^Bearer /, '');

    if (url.endsWith('/user/tokens/verify')) {
      verificationTokens.push(token);
      assert.equal(token, dedicatedToken);
      return {
        ok: false,
        statusText: 'Bad Request',
        async json() {
          return {
            success: false,
            errors: [{ code: 6003, message: 'Invalid request headers' }],
          };
        },
      };
    }

    providerTokens.push(token);
    providerUrls.push(url);
    assert.equal(token, dedicatedToken);

    if (url.includes('/workers/scripts?')) {
      return response([{ id: 'sekret-backend', tag: WORKER_TAG }]);
    }
    if (url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)) {
      return response([productionTrigger()]);
    }
    throw new Error(`Unexpected request: ${options.method || 'GET'} ${url}`);
  };

  const evidence = await reconcileWorkersBuildTrigger({
    env: {
      CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: dedicatedToken,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
    },
    apply: false,
    fetchImpl,
    now: () => new Date('2026-08-31T22:20:00.000Z'),
  });

  assert.deepEqual(verificationTokens, [dedicatedToken]);
  assert.ok(providerUrls.filter((url) => url.includes('/workers/scripts?')).length >= 2);
  assert.ok(providerUrls.filter((url) => url.endsWith(`/builds/workers/${WORKER_TAG}/triggers`)).length >= 2);
  assert.ok(providerTokens.every((token) => token === dedicatedToken));
  assert.equal(evidence.credential.selectedSource, 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN');
  assert.equal(evidence.status, 'already-correct');
  assert.equal(evidence.triggerVerified, true);
  assert.equal(evidence.verified, true);

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, new RegExp(dedicatedToken));
});

test('still fails closed when every configured Cloudflare token is invalid', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-workers-token-fail-closed-'));
  const evidencePath = path.join(dir, 'evidence.json');
  let providerCalls = 0;

  const fetchImpl = async (url) => {
    if (url.endsWith('/user/tokens/verify')) {
      return response(null, { ok: false, statusText: 'Invalid API Token' });
    }
    providerCalls += 1;
    return response(null);
  };

  await assert.rejects(
    () => reconcileWorkersBuildTrigger({
      env: {
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: 'bad-one',
        CLOUDFLARE_API_TOKEN: 'bad-two',
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_BUILD_EVIDENCE_PATH: evidencePath,
      },
      apply: false,
      fetchImpl,
    }),
    /CLOUDFLARE_WORKERS_BUILDS_TOKEN_SELECTION_FAILED/,
  );

  assert.equal(providerCalls, 0);
  const retained = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(retained.status, 'provider-discovery-failed');
  assert.equal(retained.credential.selectedSource, null);
  assert.doesNotMatch(JSON.stringify(retained), /bad-one|bad-two/);
});
