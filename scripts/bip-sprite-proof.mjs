#!/usr/bin/env node
// Founder-triggered, read-only proof runner for a private Sprite environment.
// No arbitrary commands, external data, or mutation authority.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTRACT = 'juss/bip-sprite-proof@v1';
export const MISSIONS = Object.freeze({
  'repo-truth': Object.freeze({ command: 'git', args: ['status', '--porcelain=v1'] }),
  'agent-contract': Object.freeze({ command: 'node', args: ['--test', 'test/agent-discovery.test.mjs'] }),
  'companion-contract': Object.freeze({ command: 'node', args: ['--test', 'test/companion-runtime-contracts.test.mjs'] }),
});
const SHA_RE = /^[0-9a-f]{40}$/;
const script = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(script), '..');
const receiptRoot = '/home/sprite/.sprite-proof/receipts';
// This sandbox home is intentionally isolated from the operator's credentialed profile.
fs.mkdirSync('/home/sprite/.bip-sprite-home', { recursive: true, mode: 0o700 });

export function parseRequest(argv) {
  if (argv.length !== 4 || argv[0] !== '--mission' || argv[2] !== '--sha') {
    throw new Error('BIP_SPRITE_FIXED_MISSION_AND_SHA_REQUIRED');
  }
  const mission = argv[1], sha = argv[3];
  if (!Object.hasOwn(MISSIONS, mission)) throw new Error('BIP_SPRITE_MISSION_DENIED');
  if (!SHA_RE.test(sha)) throw new Error('BIP_SPRITE_SHA_INVALID');
  return { mission, sha };
}

export function safeEnvironment(env = process.env) {
  // Child processes receive no GitHub, Cloudflare, Supabase, provider, or user secrets.
  return {
    PATH: '/.sprite/bin:/usr/local/bin:/usr/bin:/bin',
    HOME: '/home/sprite/.bip-sprite-home',
    CI: 'true',
    NODE_ENV: 'test',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_NOSYSTEM: '1',
  };
}

export function receiptFor({ sha, mission, result, startedAt, finishedAt }) {
  const content = String(result.stdout ?? '') + '\n' + String(result.stderr ?? '');
  return {
    schema: CONTRACT,
    source: { repository: 'jussray/Sekret-Bip', sha },
    mission,
    status: result.status === 0 && !result.error && !result.signal ? 'pass' : 'fail',
    exitCode: Number.isInteger(result.status) ? result.status : null,
    outputFingerprint: 'sha256:' + createHash('sha256').update(content).digest('hex'),
    startedAt, finishedAt,
    networkPolicy: 'deny-all',
    inputs: 'public-repository-code-only',
    authority: { merge: false, deploy: false, providerMutation: false, userDataAccess: false },
  };
}

export function runProof({ mission, sha }, { root = repositoryRoot, spawn = spawnSync, now = () => new Date().toISOString(), env = process.env } = {}) {
  if (!Object.hasOwn(MISSIONS, mission) || !SHA_RE.test(sha)) throw new Error('BIP_SPRITE_REQUEST_INVALID');
  if (env.FOUNDER_OPERATION_KILL_SWITCH && env.FOUNDER_OPERATION_KILL_SWITCH !== 'off') {
    throw new Error('FOUNDER_OPERATION_PAUSED');
  }
  const git = spawn('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: root, env: safeEnvironment(env), encoding: 'utf8', timeout: 10_000, maxBuffer: 4096, shell: false,
  });
  if (git.status !== 0 || String(git.stdout).trim() !== sha) throw new Error('BIP_SPRITE_EXACT_HEAD_MISMATCH');

  const selected = MISSIONS[mission];
  const start = now();
  const result = spawn(selected.command, selected.args, {
    cwd: root, env: safeEnvironment(env), encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024, shell: false,
  });
  return receiptFor({ mission, sha, result, startedAt: start, finishedAt: now() });
}

function main() {
  try {
    const req = parseRequest(process.argv.slice(2));
    const receipt = runProof(req);
    fs.mkdirSync(receiptRoot, { recursive: true, mode: 0o700 });
    const destination = path.join(receiptRoot, req.sha + '-' + req.mission + '.json');
    // Repeated runs update the same bounded proof slot, never a repo file.
    fs.writeFileSync(destination, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ receipt: destination, status: receipt.status, sha: receipt.source.sha, mission: receipt.mission }));
    if (receipt.status !== 'pass') process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) main();
