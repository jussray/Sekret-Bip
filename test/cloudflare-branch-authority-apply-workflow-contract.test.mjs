import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const applyWorkflow = await readFile(new URL('../.github/workflows/cloudflare-branch-authority-apply.yml', import.meta.url), 'utf8');
const auditWorkflow = await readFile(new URL('../.github/workflows/cloudflare-branch-authority.yml', import.meta.url), 'utf8');
const workerVerifier = await readFile(new URL('../scripts/verify-cloudflare-worker-branch-authority.mjs', import.meta.url), 'utf8');
const pagesVerifier = await readFile(new URL('../scripts/verify-cloudflare-pages-branch-authority.mjs', import.meta.url), 'utf8');
const targets = JSON.parse(await readFile(new URL('../config/cloudflare-targets.json', import.meta.url), 'utf8'));

test('provider topology preserves bip, canonical backend, founder-gated alpha, and Pages authorities', () => {
  assert.equal(targets.production.worker.name, 'sekret-backend');
  assert.equal(targets.nonProduction.worker.name, 'sekret-backend-alpha');
  assert.equal(targets.production.pages.name, 'sekret-bip');
  assert.deepEqual(targets.providerInventory.workers, ['bip', 'sekret-backend', 'sekret-backend-alpha']);
  assert.deepEqual(targets.providerInventory.pages, ['sekret-bip']);
  assert.equal(targets.separateWorkerAuthorities.bip.status, 'founder-confirmed-renamed-from-sekret');
  assert.equal(targets.separateWorkerAuthorities.bip.previousName, 'sekret');
  assert.equal(targets.separateWorkerAuthorities.bip.routeBinding, 'provider-readback-required');
});

test('founder apply remains manual-only, exact-main pinned, and Production-environment gated', () => {
  assert.match(applyWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(applyWorkflow, /\npush:/);
  assert.match(applyWorkflow, /expected_main_sha:/);
  assert.match(applyWorkflow, /FIX_646_MAIN_ONLY_WORKER_BUILDS/);
  assert.match(applyWorkflow, /environment: Production/);
  assert.match(applyWorkflow, /CLOUDFLARE_WORKERS_BUILDS_API_TOKEN/);
  assert.match(applyWorkflow, /CLOUDFLARE_PAGES_READ_API_TOKEN/);
  assert.doesNotMatch(applyWorkflow, /CLOUDFLARE_API_TOKEN/);
});

test('founder repair mutates only canonical sekret-backend branch authority', () => {
  assert.match(applyWorkflow, /const productionWorker = 'sekret-backend'/);
  assert.match(applyWorkflow, /const alphaWorker = 'sekret-backend-alpha'/);
  assert.match(applyWorkflow, /const pagesProject = 'sekret-bip'/);
  assert.match(applyWorkflow, /alphaWorkerMutationPerformed: false/);
  assert.match(applyWorkflow, /pagesMutationPerformed: false/);
  assert.doesNotMatch(applyWorkflow, /method: 'DELETE'/);
  assert.equal(targets.separateWorkerAuthorities.bip.mutationPolicy, 'preserve-until-exact-provider-binding-proven');
});

test('Pages audit remains read-only while trying only explicitly configured Cloudflare read credentials by capability', () => {
  assert.match(auditWorkflow, /CLOUDFLARE_WORKERS_BUILDS_API_TOKEN/);
  assert.match(auditWorkflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(auditWorkflow, /CLOUDFLARE_PAGES_READ_API_TOKEN/);
  assert.match(auditWorkflow, /verify-cloudflare-worker-branch-authority\.mjs/);
  assert.match(auditWorkflow, /verify-cloudflare-pages-branch-authority\.mjs/);
  assert.match(pagesVerifier, /CLOUDFLARE_PAGES_READ_API_TOKEN/);
  assert.match(pagesVerifier, /CLOUDFLARE_API_TOKEN/);
  assert.match(pagesVerifier, /CLOUDFLARE_WORKERS_BUILDS_API_TOKEN/);
  assert.match(pagesVerifier, /projectPath/);
  assert.match(pagesVerifier, /mutationPerformed: false/);
});

test('read-only audit observes bip separately while keeping backend branch repair isolated', () => {
  assert.match(auditWorkflow, /Audit Cloudflare Worker and Pages Branch Authority/);
  assert.match(workerVerifier, /const separateWorker = 'bip'/);
  assert.match(workerVerifier, /const previousSeparateWorker = 'sekret'/);
  assert.match(workerVerifier, /const productionWorker = 'sekret-backend'/);
  assert.match(workerVerifier, /const alphaWorker = 'sekret-backend-alpha'/);
  assert.match(workerVerifier, /role: 'separate-protected'/);
  assert.match(workerVerifier, /bindingAuthority: 'provider-readback-required'/);
  assert.match(workerVerifier, /mutationAuthorized: false/);
  assert.match(workerVerifier, /mode: 'read-only'/);
  assert.match(workerVerifier, /mutationPerformed: false/);
});

test('Workers credential shape checks stay fail-closed before the capability probe', () => {
  assert.match(workerVerifier, /startsWith\('cfat_'\)/);
  assert.match(workerVerifier, /workers-builds-account-token-unsupported/);
  assert.match(workerVerifier, /startsWith\('cfut_'\)/);
  assert.match(workerVerifier, /token-leading-or-trailing-whitespace/);
  assert.match(workerVerifier, /token-bearer-prefix-stored/);
  assert.match(workerVerifier, /token-quoted-secret/);
  assert.match(workerVerifier, /probeWorkersRead/);
});
