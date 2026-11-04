#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_REPOSITORY = 'jussray/Sekret-Bip';
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const targetDir = path.resolve(valueAfter('--target') || process.env.CONTROL_ROOM_REPO_DIR || scriptRoot);
const shouldEnsure = args.length === 0 || args.includes('--ensure');
const shouldFetch = args.includes('--fetch');
const outputJson = args.includes('--json');
const reportPath = path.join(scriptRoot, 'reports', 'control-room', 'github-route-latest.json');

function sanitize(value) {
  return String(value || '')
    .replace(/\b(?:ghp_|github_pat_)[A-Za-z0-9_]+\b/g, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .slice(-2_000);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 2 * 1024 * 1024,
    shell: false,
  });
  return {
    ok: result.status === 0,
    status: typeof result.status === 'number' ? result.status : null,
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr || result.error?.message),
  };
}

function commandAvailable(command) {
  return run(command, ['--version']).ok;
}

function normalizeRepository(remoteUrl) {
  const value = String(remoteUrl || '').trim().replace(/\.git$/, '');
  const sshMatch = value.match(/^git@github\.com:([^/]+\/[^/]+)$/i);
  if (sshMatch) return sshMatch[1];
  const sshUrlMatch = value.match(/^ssh:\/\/git@github\.com\/([^/]+\/[^/]+)$/i);
  if (sshUrlMatch) return sshUrlMatch[1];
  const httpsMatch = value.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/i);
  if (httpsMatch) return httpsMatch[1];
  return '';
}

function isGitCheckout(directory) {
  return run('git', ['-C', directory, 'rev-parse', '--is-inside-work-tree']).stdout.trim() === 'true';
}

function verifyCheckout(directory) {
  if (!isGitCheckout(directory)) throw new Error('repository_checkout_missing');
  const remote = run('git', ['-C', directory, 'remote', 'get-url', 'origin']);
  if (!remote.ok) throw new Error('repository_origin_missing');
  const repository = normalizeRepository(remote.stdout);
  if (repository.toLowerCase() !== EXPECTED_REPOSITORY.toLowerCase()) {
    throw new Error(`repository_origin_mismatch:${repository || 'unknown'}`);
  }
  const head = run('git', ['-C', directory, 'rev-parse', 'HEAD']);
  const branch = run('git', ['-C', directory, 'branch', '--show-current']);
  return {
    directory,
    repository,
    remote: remote.stdout.trim(),
    head: head.ok ? head.stdout.trim() : null,
    branch: branch.ok ? branch.stdout.trim() || null : null,
  };
}

function directoryIsEmpty(directory) {
  return !fs.existsSync(directory) || fs.readdirSync(directory).length === 0;
}

function cloneCheckout(directory) {
  if (!commandAvailable('git')) throw new Error('git_not_available');
  if (!directoryIsEmpty(directory)) throw new Error('checkout_target_not_empty');
  fs.mkdirSync(path.dirname(directory), { recursive: true });

  if (commandAvailable('gh')) {
    const auth = run('gh', ['auth', 'status', '--hostname', 'github.com']);
    if (auth.ok) {
      const cloned = run('gh', ['repo', 'clone', EXPECTED_REPOSITORY, directory, '--', '--filter=blob:none', '--no-tags']);
      if (cloned.ok) return 'gh';
    }
  }

  const cloned = run('git', [
    'clone',
    '--filter=blob:none',
    '--no-tags',
    `https://github.com/${EXPECTED_REPOSITORY}.git`,
    directory,
  ]);
  if (!cloned.ok) throw new Error(`repository_clone_failed:${cloned.stderr || cloned.status}`);
  return 'git-https';
}

function verifyNetwork(checkout) {
  if (commandAvailable('gh')) {
    const auth = run('gh', ['auth', 'status', '--hostname', 'github.com']);
    if (auth.ok) {
      const api = run('gh', ['api', `repos/${EXPECTED_REPOSITORY}`, '--jq', '.full_name']);
      if (api.ok && api.stdout.trim().toLowerCase() === EXPECTED_REPOSITORY.toLowerCase()) {
        return { ok: true, transport: 'gh-api' };
      }
    }
  }

  const probe = checkout
    ? run('git', ['-C', checkout.directory, 'ls-remote', '--exit-code', 'origin', 'HEAD'])
    : run('git', ['ls-remote', '--exit-code', `https://github.com/${EXPECTED_REPOSITORY}.git`, 'HEAD']);
  if (!probe.ok) throw new Error(`github_network_unavailable:${probe.stderr || probe.status}`);
  return { ok: true, transport: 'git-smart-http' };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const startedAt = new Date().toISOString();
  let cloneTransport = null;

  if (!isGitCheckout(targetDir)) {
    if (!shouldEnsure) throw new Error('repository_checkout_missing');
    cloneTransport = cloneCheckout(targetDir);
  }

  const checkout = verifyCheckout(targetDir);
  const network = verifyNetwork(checkout);

  let fetched = false;
  if (shouldFetch) {
    const result = run('git', ['-C', targetDir, 'fetch', '--prune', 'origin']);
    if (!result.ok) throw new Error(`repository_fetch_failed:${result.stderr || result.status}`);
    fetched = true;
  }

  const report = {
    schemaVersion: 1,
    repository: EXPECTED_REPOSITORY,
    status: 'pass',
    startedAt,
    finishedAt: new Date().toISOString(),
    checkout,
    cloneTransport,
    network,
    fetched,
    mutationBoundary: 'clone-if-missing-and-empty; fetch-only; no pull, reset, checkout, merge, rebase, push, or force',
  };
  writeReport(report);
  console.log(outputJson ? JSON.stringify(report) : [
    `Repository checkout: ${checkout.directory}`,
    `Origin: ${checkout.repository}`,
    `GitHub route: ${network.transport}`,
    `Fetch: ${fetched ? 'completed' : 'not requested'}`,
    `Report: ${reportPath}`,
  ].join('\n'));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const report = {
    schemaVersion: 1,
    repository: EXPECTED_REPOSITORY,
    status: 'blocked',
    finishedAt: new Date().toISOString(),
    targetDir,
    error: sanitize(message),
    mutationBoundary: 'no destructive repository operations',
  };
  writeReport(report);
  console.error(outputJson ? JSON.stringify(report) : `GitHub route blocked: ${report.error}`);
  process.exitCode = 1;
}
