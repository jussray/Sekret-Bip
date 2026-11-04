import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildWranglerDeployArgs,
  deployCloudflareWorker,
  inspectDeployGitState,
  normalizeCommitSha,
  resolveDeployCommitSha,
} from '../scripts/deploy-cloudflare-worker.mjs';

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const OTHER_SHA = '1234567890abcdef1234567890abcdef12345678';

function fakeGit({ head = SHA, status = '' } = {}) {
  return (_command, args) => {
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return `${head}\n`;
    if (args[0] === 'status') return status;
    throw new Error(`Unexpected git invocation: ${args.join(' ')}`);
  };
}

test('normalizes only exact 40-character Git SHAs', () => {
  assert.equal(normalizeCommitSha(SHA.toUpperCase()), SHA);
  assert.equal(normalizeCommitSha('abcdef'), null);
  assert.equal(normalizeCommitSha('not-a-sha'), null);
});

test('accepts only a clean checked-out Git HEAD for deployment', () => {
  assert.deepEqual(
    inspectDeployGitState({ execFile: fakeGit() }),
    { headSha: SHA, clean: true },
  );
});

test('refuses tracked or untracked dirty worktrees before deployment', () => {
  assert.throws(
    () => inspectDeployGitState({ execFile: fakeGit({ status: ' M worker/voice-entry.ts\n?? scratch.txt\n' }) }),
    /dirty worktree/,
  );
});

test('prefers the immutable Workers Builds commit SHA only when it matches checked-out HEAD', () => {
  assert.equal(
    resolveDeployCommitSha({
      env: { WORKERS_CI_COMMIT_SHA: SHA },
      execFile: fakeGit(),
    }),
    SHA,
  );
});

test('refuses a Workers Builds SHA that does not match checked-out HEAD', () => {
  assert.throws(
    () => resolveDeployCommitSha({
      env: { WORKERS_CI_COMMIT_SHA: OTHER_SHA },
      execFile: fakeGit(),
    }),
    /does not match checked-out Git HEAD/,
  );
});

test('refuses malformed Workers Builds identity instead of silently falling back', () => {
  assert.throws(
    () => resolveDeployCommitSha({
      env: { WORKERS_CI_COMMIT_SHA: 'deadbeef' },
      execFile: fakeGit(),
    }),
    /WORKERS_CI_COMMIT_SHA must be an exact 40-character Git commit SHA/,
  );
});

test('uses clean local HEAD when Workers Builds identity is absent', () => {
  assert.equal(
    resolveDeployCommitSha({ env: {}, execFile: fakeGit() }),
    SHA,
  );
});

test('builds a Wrangler deployment command tagged to the exact Git SHA', () => {
  assert.deepEqual(buildWranglerDeployArgs(SHA), [
    'wrangler',
    'deploy',
    '--tag',
    SHA,
    '--message',
    `git:${SHA}`,
  ]);
});

test('refuses malformed deployment identity', () => {
  assert.throws(
    () => buildWranglerDeployArgs('deadbeef'),
    /valid 40-character Git commit SHA/,
  );
});

test('stamps the exact deploy SHA before Wrangler and restores the tracked placeholder', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-worker-deploy-'));
  const workerDir = path.join(cwd, 'worker');
  const identityPath = path.join(workerDir, 'release-identity.generated.ts');
  const placeholder = "export const WORKER_RELEASE_SHA = 'development' as const;\n";
  fs.mkdirSync(workerDir, { recursive: true });
  fs.writeFileSync(identityPath, placeholder, 'utf8');

  const events = [];
  const deployedSha = deployCloudflareWorker({
    cwd,
    env: { WORKERS_CI_COMMIT_SHA: SHA },
    execFile: fakeGit(),
    writeIdentity: ({ env, outputPath }) => {
      assert.equal(env.WORKERS_CI_COMMIT_SHA, SHA);
      assert.equal(outputPath, identityPath);
      fs.writeFileSync(outputPath, `export const WORKER_RELEASE_SHA = '${SHA}' as const;\n`, 'utf8');
      events.push('stamp');
      return SHA;
    },
    spawn: (_command, args, options) => {
      events.push('deploy');
      assert.deepEqual(args, buildWranglerDeployArgs(SHA));
      assert.equal(options.cwd, cwd);
      assert.match(fs.readFileSync(identityPath, 'utf8'), new RegExp(SHA));
      return { status: 0 };
    },
  });

  assert.equal(deployedSha, SHA);
  assert.deepEqual(events, ['stamp', 'deploy']);
  assert.equal(fs.readFileSync(identityPath, 'utf8'), placeholder);
});

test('rejects a mismatched identity stamp before Wrangler and still restores the placeholder', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-worker-deploy-mismatch-'));
  const workerDir = path.join(cwd, 'worker');
  const identityPath = path.join(workerDir, 'release-identity.generated.ts');
  const placeholder = "export const WORKER_RELEASE_SHA = 'development' as const;\n";
  fs.mkdirSync(workerDir, { recursive: true });
  fs.writeFileSync(identityPath, placeholder, 'utf8');

  let deployCalled = false;
  assert.throws(
    () => deployCloudflareWorker({
      cwd,
      env: { WORKERS_CI_COMMIT_SHA: SHA },
      execFile: fakeGit(),
      writeIdentity: ({ outputPath }) => {
        fs.writeFileSync(outputPath, `export const WORKER_RELEASE_SHA = '${OTHER_SHA}' as const;\n`, 'utf8');
        return OTHER_SHA;
      },
      spawn: () => {
        deployCalled = true;
        return { status: 0 };
      },
    }),
    /does not match deployment SHA/,
  );

  assert.equal(deployCalled, false);
  assert.equal(fs.readFileSync(identityPath, 'utf8'), placeholder);
});
