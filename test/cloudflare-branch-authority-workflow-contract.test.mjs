import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/cloudflare-branch-authority.yml', import.meta.url), 'utf8');
const workerVerifierUrl = new URL('../scripts/verify-cloudflare-worker-branch-authority.mjs', import.meta.url);
const workerVerifier = await readFile(workerVerifierUrl, 'utf8');

test('Cloudflare branch-authority workflow is read-only, exact-main gated, and observes bip plus backend', () => {
  assert.match(workflow, /Audit Cloudflare Worker and Pages Branch Authority/);
  assert.match(workflow, /Verify exact current main before provider credential use/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /CLOUDFLARE_WORKERS_BUILDS_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN is intentionally excluded/);
  assert.doesNotMatch(workflow, /CLOUDFLARE_API_TOKEN:\s*\$\{\{/);
  assert.match(workflow, /CLOUDFLARE_PAGES_READ_API_TOKEN/);
  assert.match(workflow, /Require both independent provider readbacks/);
  assert.match(workerVerifier, /schemaVersion: 11/);
  assert.match(workerVerifier, /const separateWorker = 'bip'/);
  assert.match(workerVerifier, /const previousSeparateWorker = 'sekret'/);
  assert.match(workerVerifier, /const productionWorker = 'sekret-backend'/);
  assert.match(workerVerifier, /workers-builds-account-token-unsupported/);
  assert.match(workerVerifier, /probe: 'token-verify-user'/);
  assert.match(workerVerifier, /builds\/workers\/\$\{separateTag\}\/triggers/);
  assert.match(workerVerifier, /builds\/workers\/\$\{productionTag\}\/triggers/);
  assert.match(workerVerifier, /separateBuildConnectionMainOnly/);
  assert.doesNotMatch(workflow, /method:\s*['\"]?(?:PUT|PATCH|DELETE)/i);
});

test('Worker authority verifier rejects account-scoped Workers Builds token before network use', async () => {
  const originalFetch = globalThis.fetch;
  const envKeys = ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_WORKERS_BUILDS_API_TOKEN','CLOUDFLARE_API_TOKEN','EVIDENCE_PATH','GITHUB_REF','GITHUB_SHA'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const tempDir = await mkdtemp(join(tmpdir(), 'bip-cloudflare-token-shape-'));
  const evidencePath = join(tempDir, 'receipt.json');
  let fetchCalls = 0;
  process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
  process.env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN = 'cfat_account_scoped_token';
  delete process.env.CLOUDFLARE_API_TOKEN;
  process.env.EVIDENCE_PATH = evidencePath;
  process.env.GITHUB_REF = 'refs/heads/main';
  process.env.GITHUB_SHA = '1111111111111111111111111111111111111111';
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('network must not be called'); };
  let thrown;
  try { await import(`${workerVerifierUrl.href}?cfat-test=${Date.now()}`); } catch (error) { thrown = error; }
  finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
  try {
    assert.ok(thrown instanceof Error);
    assert.equal(fetchCalls, 0);
    const raw = await readFile(evidencePath, 'utf8');
    const receipt = JSON.parse(raw);
    assert.equal(receipt.status, 'blocked');
    assert.equal(receipt.failure?.code, 'workers-builds-account-token-unsupported');
    assert.equal(receipt.credential.attempts[0]?.shape, 'account-scoped');
    assert.equal(raw.includes('cfat_account_scoped_token'), false);
  } finally { await rm(tempDir, { recursive: true, force: true }); }
});

test('Worker authority verifier requires the dedicated user token and verifies main-only Builds authority by Worker tag', async () => {
  const originalFetch = globalThis.fetch;
  const envKeys = ['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_WORKERS_BUILDS_API_TOKEN','CLOUDFLARE_API_TOKEN','EVIDENCE_PATH','GITHUB_REF','GITHUB_SHA'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const tempDir = await mkdtemp(join(tmpdir(), 'bip-cloudflare-dedicated-'));
  const evidencePath = join(tempDir, 'receipt.json');
  const accountId = 'dedicated-account';
  const dedicated = 'cfut_active_user_token';
  const general = 'cfut_general_must_not_be_used';
  const tags = { bip: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'sekret-backend': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'sekret-backend-alpha': 'cccccccccccccccccccccccccccccccc' };
  process.env.CLOUDFLARE_ACCOUNT_ID = accountId;
  process.env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN = dedicated;
  process.env.CLOUDFLARE_API_TOKEN = general;
  process.env.EVIDENCE_PATH = evidencePath;
  process.env.GITHUB_REF = 'refs/heads/main';
  process.env.GITHUB_SHA = '2222222222222222222222222222222222222222';
  globalThis.fetch = async (url, options = {}) => {
    const auth = String(options.headers?.Authorization || '').replace(/^Bearer /, '');
    assert.equal(auth, dedicated);
    const text = String(url);
    if (text.endsWith('/user/tokens/verify')) return { ok: true, status: 200, json: async () => ({ success: true, result: { status: 'active' } }) };
    if (text.includes(`/accounts/${accountId}/workers/scripts`)) return { ok: true, status: 200, json: async () => ({ success: true, result: Object.entries(tags).map(([id, tag]) => ({ id, tag })) }) };
    if (text.endsWith(`/builds/workers/${tags.bip}/triggers`)) return { ok: true, status: 200, json: async () => ({ success: true, result: [{ trigger_uuid:'bip-trigger', branch_includes:['main'], branch_excludes:[], build_command:'', deploy_command:'npm run deploy:bip', deleted_on:null }] }) };
    if (text.endsWith(`/builds/workers/${tags.bip}/builds?per_page=50`)) return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    if (text.endsWith(`/builds/workers/${tags['sekret-backend']}/triggers`)) return { ok: true, status: 200, json: async () => ({ success: true, result: [{ trigger_uuid:'prod-trigger', branch_includes:['main'], branch_excludes:[], build_command:'', deploy_command:'npm run deploy:api:production', deleted_on:null }] }) };
    if (text.endsWith(`/builds/workers/${tags['sekret-backend']}/builds?per_page=50`)) return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    if (text.endsWith(`/builds/workers/${tags['sekret-backend-alpha']}/triggers`)) return { ok: true, status: 200, json: async () => ({ success: true, result: [] }) };
    throw new Error(`Unexpected request: ${text}`);
  };
  let thrown;
  try { await import(`${workerVerifierUrl.href}?dedicated-test=${Date.now()}`); } catch (error) { thrown = error; }
  finally {
    globalThis.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  }
  try {
    assert.equal(thrown, undefined);
    const raw = await readFile(evidencePath, 'utf8');
    const receipt = JSON.parse(raw);
    assert.equal(receipt.status, 'verified');
    assert.equal(receipt.credential.selectedSource, 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN');
    assert.equal(receipt.credential.selectedShape, 'user-prefixed');
    assert.equal(receipt.separateWorker.name, 'bip');
    assert.equal(receipt.separateWorker.previousName, 'sekret');
    assert.equal(receipt.separateWorker.scriptTag, tags.bip);
    assert.equal(receipt.separateWorker.buildConnectionState, 'main-only');
    assert.equal(receipt.separateWorker.verifiedSafeBuildAuthority, true);
    assert.equal(receipt.productionWorker.scriptTag, tags['sekret-backend']);
    assert.equal(receipt.productionWorker.verifiedMainOnly, true);
    assert.equal(raw.includes(dedicated), false);
    assert.equal(raw.includes(general), false);
  } finally { await rm(tempDir, { recursive: true, force: true }); }
});
