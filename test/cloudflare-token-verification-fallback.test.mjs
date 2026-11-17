import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { verifyPagesBranchAuthority } from '../scripts/verify-cloudflare-pages-branch-authority.mjs';

const workerVerifierUrl = new URL('../scripts/verify-cloudflare-worker-branch-authority.mjs', import.meta.url);

function canonicalPagesProject() {
  return {
    name: 'sekret-bip',
    production_branch: 'main',
    domains: ['app.sekretbip.net', 'sekret-bip.pages.dev'],
    source: {
      type: 'github',
      config: {
        owner: 'jussray',
        repo_name: 'Sekret-Bip',
        production_branch: 'main',
        production_deployments_enabled: true,
        preview_deployment_setting: 'all',
        preview_branch_includes: [],
        preview_branch_excludes: [],
      },
    },
  };
}

test('Worker authority verifier selects an active credential by token verification and the real Workers read capability', async () => {
  const originalFetch = globalThis.fetch;
  const envKeys = ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_WORKERS_BUILDS_API_TOKEN','CLOUDFLARE_API_TOKEN','EVIDENCE_PATH','GITHUB_REF','GITHUB_SHA'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const tempDir = await mkdtemp(join(tmpdir(), 'bip-workers-capability-probe-'));
  const evidencePath = join(tempDir, 'receipt.json');
  const accountId = 'account-owned-token-test';
  const token = 'legacy_account_owned_token';
  const tags = {
    bip: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'sekret-backend': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'sekret-backend-alpha': 'cccccccccccccccccccccccccccccccc',
  };

  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  process.env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN = token;
  delete process.env.CLOUDFLARE_API_TOKEN;
  process.env.EVIDENCE_PATH = evidencePath;
  process.env.GITHUB_REF = 'refs/heads/main';
  process.env.GITHUB_SHA = '3333333333333333333333333333333333333333';

  globalThis.fetch = async (url, options = {}) => {
    const auth = String(options.headers?.Authorization || '').replace(/^Bearer /, '');
    assert.equal(auth, token);
    const text = String(url);
    if (text.includes('/user/tokens/verify')) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: { status: 'active' } }) };
    }
    if (text.includes(`/accounts/${accountId}/workers/scripts`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: Object.entries(tags).map(([id, tag]) => ({ id, tag })) }) };
    }
    if (text.endsWith(`/builds/workers/${tags.bip}/triggers`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: [{ trigger_uuid:'bip-trigger', branch_includes:['main'], branch_excludes:[], build_command:'', deploy_command:'npm run deploy:bip', deleted_on:null }] }) };
    }
    if (text.endsWith(`/builds/workers/${tags.bip}/builds?per_page=50`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    }
    if (text.endsWith(`/builds/workers/${tags['sekret-backend']}/triggers`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: [{ trigger_uuid:'prod-trigger', branch_includes:['main'], branch_excludes:[], build_command:'', deploy_command:'npm run deploy:api:production', deleted_on:null }] }) };
    }
    if (text.endsWith(`/builds/workers/${tags['sekret-backend']}/builds?per_page=50`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    }
    if (text.endsWith(`/builds/workers/${tags['sekret-backend-alpha']}/triggers`)) {
      return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    }
    throw new Error(`Unexpected request: ${text}`);
  };

  let thrown;
  try {
    await import(`${workerVerifierUrl.href}?workers-capability-test=${Date.now()}`);
  } catch (error) {
    thrown = error;
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }

  try {
    assert.equal(thrown, undefined);
    const receipt = JSON.parse(await readFile(evidencePath, 'utf8'));
    assert.equal(receipt.status, 'verified');
    assert.equal(receipt.credential.selectedSource, 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN');
    assert.deepEqual(
      receipt.credential.attempts.map(({ probe, result }) => ({ probe, result })),
      [
        { probe: 'token-verify-user', result: 'accepted' },
        { probe: 'workers-scripts', result: 'accepted' },
      ],
    );
    assert.equal(receipt.workersAuthorityVerified, true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('Pages authority falls back across configured read credentials and still requires real provider readback', async () => {
  const originalFetch = globalThis.fetch;
  const tempDir = await mkdtemp(join(tmpdir(), 'bip-pages-token-fallback-'));
  const output = join(tempDir, 'pages.json');
  const accountId = 'pages-fallback-account';
  const generalToken = 'general-token-without-pages-read';
  const workersToken = 'workers-token-with-pages-read';
  const seen = [];

  globalThis.fetch = async (url, options = {}) => {
    const auth = String(options.headers?.Authorization || '').replace(/^Bearer /, '');
    seen.push(auth);
    if (auth === generalToken) {
      return { ok: false, status: 403, json: async () => ({ success: false, errors: [{ code: 10000 }] }) };
    }
    assert.equal(auth, workersToken);
    return { ok: true, status: 200, json: async () => ({ success: true, result: canonicalPagesProject() }) };
  };

  try {
    const receipt = await verifyPagesBranchAuthority({
      argv: ['--output', output],
      env: {
        CLOUDFLARE_ACCOUNT_ID: accountId,
        CLOUDFLARE_API_TOKEN: generalToken,
        CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: workersToken,
        CLOUDFLARE_PAGES_PROJECT: 'sekret-bip',
        CLOUDFLARE_PAGES_PRODUCTION_BRANCH: 'main',
      },
    });
    assert.deepEqual(seen, [generalToken, workersToken]);
    assert.equal(receipt.credentialSource, 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN');
    assert.equal(receipt.verified, true);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(tempDir, { recursive: true, force: true });
  }
});