import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  evaluatePagesBranchAuthority,
  fingerprintPagesAuthority,
  normalizePagesProject,
  verifyPagesBranchAuthority,
} from '../scripts/verify-cloudflare-pages-branch-authority.mjs';

function project(overrides = {}) {
  const sourceConfig = {
    owner: 'jussray',
    production_branch: 'main',
    production_deployments_enabled: true,
    preview_deployment_setting: 'all',
    preview_branch_includes: [],
    preview_branch_excludes: [],
    repo_name: 'Sekret-Bip',
    ...(overrides.sourceConfig || {}),
  };
  return {
    name: 'sekret-bip',
    production_branch: 'main',
    domains: ['app.sekretbip.net', 'sekret-bip.pages.dev'],
    source: {
      type: 'github',
      config: sourceConfig,
    },
    ...overrides,
    source: overrides.source === null
      ? null
      : {
          type: overrides.sourceType || 'github',
          config: sourceConfig,
        },
  };
}

test('accepts canonical GitHub Pages project with main production and canonical domain', () => {
  const verdict = evaluatePagesBranchAuthority(project());
  assert.equal(verdict.verified, true);
  assert.deepEqual(verdict.failures, []);
  assert.equal(verdict.observed.name, 'sekret-bip');
  assert.equal(verdict.observed.repoOwner, 'jussray');
  assert.equal(verdict.observed.repoName, 'Sekret-Bip');
  assert.ok(verdict.observed.domains.includes('app.sekretbip.net'));
  assert.equal(verdict.observed.productionBranch, 'main');
  assert.equal(verdict.observed.productionDeploymentsEnabled, true);
  assert.equal(verdict.observed.previewDeploymentSetting, 'all');
});

test('rejects a Pages project connected to the wrong GitHub owner', () => {
  const verdict = evaluatePagesBranchAuthority(project({
    sourceConfig: { owner: 'someone-else' },
  }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('repo-owner:someone-else'));
});

test('rejects a Pages project connected to the wrong GitHub repository', () => {
  const verdict = evaluatePagesBranchAuthority(project({
    sourceConfig: { repo_name: 'not-sekret-bip' },
  }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('repo-name:not-sekret-bip'));
});

test('rejects a Pages project missing the canonical app domain', () => {
  const verdict = evaluatePagesBranchAuthority(project({
    domains: ['sekret-bip.pages.dev'],
  }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('canonical-domain:app.sekretbip.net:missing'));
});

test('rejects a non-main Pages production branch', () => {
  const verdict = evaluatePagesBranchAuthority(project({ production_branch: 'develop' }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('production-branch:develop'));
});

test('rejects disabled automatic production deployments', () => {
  const verdict = evaluatePagesBranchAuthority(project({
    sourceConfig: { production_deployments_enabled: false },
  }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('production-deployments-enabled:false'));
});

test('rejects a Pages project without GitHub source authority', () => {
  const verdict = evaluatePagesBranchAuthority(project({ source: null }));
  assert.equal(verdict.verified, false);
  assert.ok(verdict.failures.includes('source-type:missing'));
});

test('accepts custom preview branch controls while keeping canonical production authority', () => {
  const verdict = evaluatePagesBranchAuthority(project({
    sourceConfig: {
      preview_deployment_setting: 'custom',
      preview_branch_includes: ['preview/*'],
      preview_branch_excludes: ['main'],
    },
  }));
  assert.equal(verdict.verified, true);
  assert.equal(verdict.observed.previewDeploymentSetting, 'custom');
  assert.deepEqual(verdict.observed.previewBranchIncludes, ['preview/*']);
});

test('fingerprint changes when load-bearing Pages authority changes', () => {
  const first = normalizePagesProject(project());
  const second = normalizePagesProject(project({
    sourceConfig: { repo_name: 'not-sekret-bip' },
  }));
  assert.notEqual(fingerprintPagesAuthority(first), fingerprintPagesAuthority(second));
});

test('retains a sanitized blocked receipt when the Pages credential is missing', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'sekret-pages-authority-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, 'receipt.json');

  await assert.rejects(
    verifyPagesBranchAuthority({
      argv: ['--output', output],
      env: {
        CLOUDFLARE_ACCOUNT_ID: 'account-id',
        CLOUDFLARE_PAGES_PROJECT: 'sekret-bip',
        CLOUDFLARE_PAGES_PRODUCTION_BRANCH: 'main',
      },
    }),
    /A Cloudflare token with read access to the Pages project is required/,
  );

  const receipt = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(receipt.mode, 'read-only');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.status, 'blocked');
  assert.equal(receipt.credentialSource, null);
  assert.deepEqual(receipt.credentialConfiguredSources, []);
  assert.equal(receipt.verified, false);
  assert.deepEqual(receipt.failures, ['credential-not-configured']);
  assert.equal(receipt.failure.code, 'credential-not-configured');
  assert.equal(receipt.failure.providerStatus, null);
  assert.deepEqual(receipt.failure.providerCodes, []);
  assert.equal(receipt.observed, null);
  assert.equal(JSON.stringify(receipt).includes('account-id'), false);
});