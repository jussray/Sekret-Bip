import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  PROVIDER_WORKFLOW_BY_SECRET,
  evaluateProviderRun,
  extractCloudflareSecrets,
  validateCutoverReceipt,
} from '../scripts/verify-cloudflare-credential-cutover-authority.mjs';

const BASE_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function providerRun(overrides = {}) {
  return {
    id: 123456789,
    path: '.github/workflows/cloudflare-branch-authority.yml',
    head_sha: BASE_SHA,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { full_name: 'jussray/Sekret-Bip' },
    head_repository: { full_name: 'jussray/Sekret-Bip' },
    ...overrides,
  };
}

function cutoverReceipt(overrides = {}) {
  return {
    schema: 'juss/cloudflare-credential-migration@v1',
    newSecret: 'CLOUDFLARE_PAGES_READ_API_TOKEN',
    previousSecrets: ['CLOUDFLARE_API_TOKEN'],
    phase: 'cutover',
    secretStoreScope: 'GitHub Production',
    providerEvidence: { runId: 123456789 },
    ...overrides,
  };
}

test('trusted validator recognizes dot and bracket GitHub secret syntax', () => {
  const source = `
    env:
      FIRST: \${{ secrets.CLOUDFLARE_PAGES_READ_API_TOKEN }}
      SECOND: \${{ secrets['CLOUDFLARE_WORKERS_BUILDS_API_TOKEN'] }}
      THIRD: \${{ secrets["CLOUDFLARE_ACCESS_API_TOKEN"] }}
  `;
  assert.deepEqual(
    [...extractCloudflareSecrets(source)].sort(),
    [
      'CLOUDFLARE_ACCESS_API_TOKEN',
      'CLOUDFLARE_PAGES_READ_API_TOKEN',
      'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN',
    ],
  );
});

test('only the canonical provider workflows may prove dedicated credential cutover', () => {
  assert.deepEqual(PROVIDER_WORKFLOW_BY_SECRET, {
    CLOUDFLARE_ACCESS_API_TOKEN: '.github/workflows/audit-cloudflare-zone-access-coverage.yml',
    CLOUDFLARE_APP_BINDING_READ_API_TOKEN: '.github/workflows/audit-cloudflare-zone-access-coverage.yml',
    CLOUDFLARE_PAGES_READ_API_TOKEN: '.github/workflows/cloudflare-branch-authority.yml',
    CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: '.github/workflows/cloudflare-branch-authority.yml',
  });
});

test('provider run must be green on exact main base and the mapped workflow', () => {
  const verdict = evaluateProviderRun({
    run: providerRun(),
    expectedBaseSha: BASE_SHA,
    expectedWorkflowPath: '.github/workflows/cloudflare-branch-authority.yml',
  });
  assert.equal(verdict.verified, true);
  assert.deepEqual(verdict.failures, []);
});

for (const [name, run, failure] of [
  ['stale base', providerRun({ head_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }), 'exact-base-sha'],
  ['wrong workflow', providerRun({ path: '.github/workflows/audit-cloudflare-zone-access-coverage.yml' }), 'workflow-path'],
  ['non-main branch', providerRun({ head_branch: 'feature' }), 'main-branch'],
  ['untrusted event', providerRun({ event: 'pull_request' }), 'trusted-event'],
  ['pending run', providerRun({ status: 'in_progress', conclusion: null }), 'completed'],
  ['failed run', providerRun({ conclusion: 'failure' }), 'success'],
  ['foreign head repository', providerRun({ head_repository: { full_name: 'someone/fork' } }), 'same-repository'],
]) {
  test(`provider authority rejects ${name}`, () => {
    const verdict = evaluateProviderRun({
      run,
      expectedBaseSha: BASE_SHA,
      expectedWorkflowPath: '.github/workflows/cloudflare-branch-authority.yml',
    });
    assert.equal(verdict.verified, false);
    assert.ok(verdict.failures.includes(failure));
  });
}

test('cutover receipt carries only an immutable run ID, never a self-certified verdict', () => {
  const valid = validateCutoverReceipt(cutoverReceipt(), 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.deepEqual(valid, { verified: true, runId: 123456789, reason: null });

  const selfCertified = validateCutoverReceipt(cutoverReceipt({
    providerEvidence: { runId: 123456789, providerAccepted: true },
  }), 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.equal(selfCertified.verified, false);
  assert.equal(selfCertified.reason, 'provider-evidence-shape');
});

test('trusted receipt parser rejects extra top-level data, wrong store scope, and invalid previous lineage', () => {
  const extraField = validateCutoverReceipt({
    ...cutoverReceipt(),
    secretValue: 'never-allowed',
  }, 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.equal(extraField.verified, false);
  assert.equal(extraField.reason, 'unexpected-fields');

  const wrongStore = validateCutoverReceipt(cutoverReceipt({
    secretStoreScope: 'Repository',
  }), 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.equal(wrongStore.verified, false);
  assert.equal(wrongStore.reason, 'secret-store-scope');

  const noPrevious = validateCutoverReceipt(cutoverReceipt({
    previousSecrets: [],
  }), 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.equal(noPrevious.verified, false);
  assert.equal(noPrevious.reason, 'previous-secrets');

  const selfPrevious = validateCutoverReceipt(cutoverReceipt({
    previousSecrets: ['CLOUDFLARE_PAGES_READ_API_TOKEN'],
  }), 'CLOUDFLARE_PAGES_READ_API_TOKEN');
  assert.equal(selfPrevious.verified, false);
  assert.equal(selfPrevious.reason, 'previous-secrets');
});

test('trusted merge membrane owns provider-run validation and retains its receipt', () => {
  const workflow = fs.readFileSync('.github/workflows/github-merge-membrane.yml', 'utf8');
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /ref: \$\{\{ env\.TRUSTED_BASE_SHA \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test\/cloudflare-credential-cutover-authority\.test\.mjs/);
  assert.match(workflow, /node scripts\/verify-cloudflare-credential-cutover-authority\.mjs/);
  assert.match(workflow, /cloudflare-credential-cutover-authority-\$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  const authorityIndex = workflow.indexOf('Verify Cloudflare credential cutover authority from trusted base');
  const machineProofIndex = workflow.indexOf('Require exact-head machine proof');
  assert.ok(authorityIndex >= 0 && machineProofIndex > authorityIndex, 'trusted provider authority must be checked before merge-machine proof completes');
  assert.doesNotMatch(workflow, /CLOUDFLARE_(?:API|ACCESS|PAGES|WORKERS|APP_BINDING)[A-Z0-9_]*:\s*\$\{\{ secrets\./);
});
