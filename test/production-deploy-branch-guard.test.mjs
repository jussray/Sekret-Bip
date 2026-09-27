import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProductionDeployBranch,
  normalizeBranch,
  resolveDeployBranch,
} from '../scripts/assert-production-deploy-branch.mjs';

const noGitBranch = () => '';

test('normalizes common branch reference formats', () => {
  assert.equal(normalizeBranch('refs/heads/main'), 'main');
  assert.equal(normalizeBranch('refs/remotes/origin/feature/test'), 'feature/test');
  assert.equal(normalizeBranch('origin/main'), 'main');
});

test('allows Workers Builds production branch main', () => {
  const result = assertProductionDeployBranch({
    env: {
      WORKERS_CI: '1',
      WORKERS_CI_BRANCH: 'main',
      GITHUB_HEAD_REF: 'feature/ignored-in-workers-context',
      GITHUB_REF_NAME: '712/merge',
    },
    readGitBranch: noGitBranch,
  });

  assert.deepEqual(result, { branch: 'main', source: 'WORKERS_CI_BRANCH' });
});

test('blocks Workers Builds feature branches before Wrangler executes', () => {
  assert.throws(
    () =>
      assertProductionDeployBranch({
        env: { WORKERS_CI: '1', WORKERS_CI_BRANCH: 'fix/cloudflare-guard' },
        readGitBranch: noGitBranch,
      }),
    /only main may run production deploy commands/,
  );
});

test('fails closed when Workers Builds omits its branch variable', () => {
  assert.throws(
    () =>
      assertProductionDeployBranch({
        env: { WORKERS_CI: '1', GITHUB_HEAD_REF: 'main' },
        readGitBranch: noGitBranch,
      }),
    /WORKERS_CI_BRANCH did not provide branch authority/,
  );
});

test('allows Cloudflare Pages production branch main', () => {
  const result = assertProductionDeployBranch({
    env: { CF_PAGES: '1', CF_PAGES_BRANCH: 'main' },
    readGitBranch: noGitBranch,
  });

  assert.equal(result.branch, 'main');
  assert.equal(result.source, 'CF_PAGES_BRANCH');
});

test('fails closed when Pages omits its branch variable', () => {
  assert.throws(
    () =>
      assertProductionDeployBranch({
        env: { CF_PAGES: '1' },
        readGitBranch: noGitBranch,
      }),
    /CF_PAGES_BRANCH did not provide branch authority/,
  );
});

test('prefers the real GitHub PR head over the synthetic merge ref', () => {
  const result = resolveDeployBranch({
    env: {
      GITHUB_HEAD_REF: 'fix/cloudflare-production-branch-fuse-20260802',
      GITHUB_REF_NAME: '712/merge',
    },
    readGitBranch: noGitBranch,
  });

  assert.deepEqual(result, {
    branch: 'fix/cloudflare-production-branch-fuse-20260802',
    source: 'GITHUB_HEAD_REF',
  });
});

test('uses the local git branch when provider evidence is absent', () => {
  const result = assertProductionDeployBranch({
    env: {},
    readGitBranch: () => 'main',
  });

  assert.deepEqual(result, { branch: 'main', source: 'git' });
});

test('fails closed when CI branch authority is unavailable', () => {
  assert.throws(
    () =>
      assertProductionDeployBranch({
        env: { CI: 'true' },
        readGitBranch: noGitBranch,
      }),
    /did not provide branch authority/,
  );
});

test('permits an explicit detached-head override only outside CI', () => {
  const approved = assertProductionDeployBranch({
    env: {
      SEKRET_DEPLOY_BRANCH: 'main',
      SEKRET_PRODUCTION_DEPLOY_APPROVED: '1',
    },
    readGitBranch: noGitBranch,
  });
  assert.equal(approved.source, 'explicit-local-approval');

  assert.throws(
    () =>
      assertProductionDeployBranch({
        env: {
          CI: 'true',
          SEKRET_DEPLOY_BRANCH: 'main',
          SEKRET_PRODUCTION_DEPLOY_APPROVED: '1',
        },
        readGitBranch: noGitBranch,
      }),
    /did not provide branch authority/,
  );
});

test('production package scripts invoke the branch guard before deployment', async () => {
  const packageJson = (await import('../package.json', { with: { type: 'json' } })).default;
  assert.equal(
    packageJson.scripts['deploy:api:production'],
    'node scripts/assert-production-deploy-branch.mjs && node scripts/deploy-cloudflare-worker.mjs',
  );
  assert.match(
    packageJson.scripts['deploy:web:production'],
    /^node scripts\/assert-production-deploy-branch\.mjs && /,
  );
});
