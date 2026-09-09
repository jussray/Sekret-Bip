import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { writeWorkerReleaseIdentity } from './write-worker-release-identity.mjs';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RELEASE_IDENTITY_PATH = path.join('worker', 'release-identity.generated.ts');

export function normalizeCommitSha(value) {
  const sha = String(value ?? '').trim().toLowerCase();
  return SHA_PATTERN.test(sha) ? sha : null;
}

function gitOutput(args, { cwd, execFile = execFileSync } = {}) {
  return String(
    execFile('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  ).trim();
}

function readOptionalFile(filePath) {
  try {
    return { existed: true, contents: fs.readFileSync(filePath, 'utf8') };
  } catch (error) {
    if (error?.code === 'ENOENT') return { existed: false, contents: null };
    throw error;
  }
}

export function inspectDeployGitState({ cwd = process.cwd(), execFile = execFileSync } = {}) {
  const headSha = normalizeCommitSha(gitOutput(['rev-parse', 'HEAD'], { cwd, execFile }));
  if (!headSha) {
    throw new Error('Unable to resolve an exact 40-character checked-out Git HEAD for Cloudflare deployment.');
  }

  const dirty = gitOutput(
    ['status', '--porcelain=v1', '--untracked-files=all'],
    { cwd, execFile },
  );
  if (dirty) {
    throw new Error(
      'Refusing Cloudflare production deployment from a dirty worktree. Commit or remove tracked/untracked changes first.',
    );
  }

  return { headSha, clean: true };
}

export function resolveDeployCommitSha({
  env = process.env,
  cwd = process.cwd(),
  execFile = execFileSync,
} = {}) {
  const { headSha } = inspectDeployGitState({ cwd, execFile });
  const workersBuildSha = normalizeCommitSha(env.WORKERS_CI_COMMIT_SHA);

  if (env.WORKERS_CI_COMMIT_SHA && !workersBuildSha) {
    throw new Error('WORKERS_CI_COMMIT_SHA must be an exact 40-character Git commit SHA.');
  }

  if (workersBuildSha && workersBuildSha !== headSha) {
    throw new Error(
      `Workers Builds commit SHA ${workersBuildSha} does not match checked-out Git HEAD ${headSha}.`,
    );
  }

  return workersBuildSha ?? headSha;
}

export function buildWranglerDeployArgs(commitSha) {
  const sha = normalizeCommitSha(commitSha);
  if (!sha) throw new Error('A valid 40-character Git commit SHA is required.');
  return ['wrangler', 'deploy', '--tag', sha, '--message', `git:${sha}`];
}

export function deployCloudflareWorker(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const sha = resolveDeployCommitSha({ ...options, cwd, env });
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = buildWranglerDeployArgs(sha);
  const spawn = options.spawn ?? spawnSync;
  const writeIdentity = options.writeIdentity ?? writeWorkerReleaseIdentity;
  const identityPath = path.join(cwd, RELEASE_IDENTITY_PATH);
  const originalIdentity = readOptionalFile(identityPath);

  try {
    const stampedSha = normalizeCommitSha(writeIdentity({
      env: { ...env, WORKERS_CI_COMMIT_SHA: sha },
      outputPath: identityPath,
    }));
    if (stampedSha !== sha) {
      throw new Error(
        `Worker release identity stamp ${stampedSha ?? 'invalid'} does not match deployment SHA ${sha}.`,
      );
    }

    const result = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Cloudflare Worker deployment failed with exit code ${result.status ?? 'unknown'}.`);
    }
  } finally {
    if (originalIdentity.existed) {
      fs.writeFileSync(identityPath, originalIdentity.contents, 'utf8');
    } else {
      fs.rmSync(identityPath, { force: true });
    }
  }

  return sha;
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    const sha = deployCloudflareWorker();
    console.log(`Deployed sekret-backend with exact Git tag ${sha}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  }
}
