import assert from 'node:assert/strict';
import test from 'node:test';
import { MISSIONS, parseRequest, safeEnvironment, receiptFor, runProof } from '../scripts/bip-sprite-proof.mjs';

const sha = 'a'.repeat(40);
test('only fixed missions and one exact SHA are accepted', () => {
  assert.deepEqual(Object.keys(MISSIONS), ['repo-truth', 'agent-contract', 'companion-contract']);
  assert.deepEqual(parseRequest(['--mission', 'agent-contract', '--sha', sha]), { mission: 'agent-contract', sha });
  for (const args of [
    ['--mission', 'shell', '--sha', sha],
    ['--mission', 'repo-truth', '--sha', 'main'],
    ['--mission', 'repo-truth', '--sha', sha, ';curl example.com'],
    ['--mission', 'repo-truth'],
  ]) assert.throws(() => parseRequest(args));
});

test('provider secrets cannot cross into spawned proof jobs', () => {
  const env = safeEnvironment({ GITHUB_TOKEN: 'secret', CLOUDFLARE_API_TOKEN: 'secret', SUPABASE_SERVICE_ROLE_KEY: 'secret' });
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.CLOUDFLARE_API_TOKEN, undefined);
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  assert.equal(env.CI, 'true');
});

test('exact-head mismatch fails before any proof task', () => {
  const calls = [];
  const spawn = (command, args) => {
    calls.push({ command, args });
    return { status: 0, stdout: 'b'.repeat(40) + '\n', stderr: '' };
  };
  assert.throws(() => runProof({ mission: 'repo-truth', sha }, { spawn }), /EXACT_HEAD_MISMATCH/);
  assert.equal(calls.length, 1);
});

test('kill switch blocks before invoking git or child process', () => {
  const spawn = () => { throw new Error('should not execute'); };
  assert.throws(() => runProof({ mission: 'repo-truth', sha }, { spawn, env: { FOUNDER_OPERATION_KILL_SWITCH: 'all' } }), /FOUNDER_OPERATION_PAUSED/);
});

test('receipts fingerprint outputs and never convey mutation authority', () => {
  const receipt = receiptFor({ mission: 'agent-contract', sha, result: { status: 0, stdout: 'private output', stderr: '' }, startedAt: 't0', finishedAt: 't1' });
  const encoded = JSON.stringify(receipt);
  assert.equal(receipt.status, 'pass');
  assert.match(receipt.outputFingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.doesNotMatch(encoded, /private output/);
  assert.deepEqual(receipt.authority, { merge: false, deploy: false, providerMutation: false, userDataAccess: false });
});

test('fixed runner uses shell=false and a sanitized environment', () => {
  const calls = [];
  const spawn = (command, args, opts) => {
    calls.push({ command, args, opts });
    return calls.length === 1 ? { status: 0, stdout: sha + '\n', stderr: '' } : { status: 0, stdout: 'test passed', stderr: '' };
  };
  const receipt = runProof({ mission: 'companion-contract', sha }, { spawn, env: { GITHUB_TOKEN: 'secret' }, now: () => '2026-10-31' });
  assert.equal(receipt.status, 'pass');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].command, 'node');
  assert.equal(calls[1].opts.shell, false);
  assert.equal(calls[1].opts.env.GITHUB_TOKEN, undefined);
});
