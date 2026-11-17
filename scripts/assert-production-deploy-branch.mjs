import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_BRANCH = 'main';

export function normalizeBranch(value) {
  return String(value ?? '')
    .trim()
    .replace(/^refs\/heads\//, '')
    .replace(/^refs\/remotes\/origin\//, '')
    .replace(/^origin\//, '');
}

function readCurrentGitBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export function resolveDeployBranch({ env = process.env, readGitBranch = readCurrentGitBranch } = {}) {
  const workersBranch = normalizeBranch(env.WORKERS_CI_BRANCH);
  const pagesBranch = normalizeBranch(env.CF_PAGES_BRANCH);
  const githubHeadBranch = normalizeBranch(env.GITHUB_HEAD_REF);
  const githubRefBranch = normalizeBranch(env.GITHUB_REF_NAME);

  if (env.WORKERS_CI === '1') {
    if (!workersBranch) {
      return { branch: '', source: 'WORKERS_CI_BRANCH' };
    }
    return { branch: workersBranch, source: 'WORKERS_CI_BRANCH' };
  }

  if (env.CF_PAGES === '1' || pagesBranch) {
    if (!pagesBranch) {
      return { branch: '', source: 'CF_PAGES_BRANCH' };
    }
    return { branch: pagesBranch, source: 'CF_PAGES_BRANCH' };
  }

  if (githubHeadBranch) {
    return { branch: githubHeadBranch, source: 'GITHUB_HEAD_REF' };
  }

  if (githubRefBranch) {
    return { branch: githubRefBranch, source: 'GITHUB_REF_NAME' };
  }

  const gitBranch = normalizeBranch(readGitBranch());
  if (gitBranch) {
    return { branch: gitBranch, source: 'git' };
  }

  const localOverride = normalizeBranch(env.SEKRET_DEPLOY_BRANCH);
  const isProviderOrCi = env.WORKERS_CI === '1' || env.CF_PAGES === '1' || env.CI === 'true';
  if (
    localOverride &&
    env.SEKRET_PRODUCTION_DEPLOY_APPROVED === '1' &&
    !isProviderOrCi
  ) {
    return { branch: localOverride, source: 'explicit-local-approval' };
  }

  return { branch: '', source: 'unknown' };
}

export function assertProductionDeployBranch(options = {}) {
  const result = resolveDeployBranch(options);

  if (!result.branch) {
    throw new Error(
      `Production deployment blocked: ${result.source} did not provide branch authority. ` +
        'Run from main, or for a deliberate local detached-head release set ' +
        'SEKRET_DEPLOY_BRANCH=main and SEKRET_PRODUCTION_DEPLOY_APPROVED=1. ' +
        'CI, Workers Builds, and Pages may not use this override.',
    );
  }

  if (result.branch !== PRODUCTION_BRANCH) {
    throw new Error(
      `Production deployment blocked: ${result.source} resolved to ` +
        `${result.branch}; only ${PRODUCTION_BRANCH} may run production deploy commands.`,
    );
  }

  return result;
}

const executedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedDirectly) {
  try {
    const result = assertProductionDeployBranch();
    console.log(`Production deployment branch verified: ${result.branch} (${result.source}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
