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
    return calls.length === 1 ? { status: 0, stdout: sha + '\n', stderr: '' } : calls.length === 2 ? { status: 0, stdout: '', stderr: '' } : { status: 0, stdout: 'test passed', stderr: '' };
  };
  const receipt = runProof({ mission: 'companion-contract', sha }, { spawn, env: { GITHUB_TOKEN: 'secret' }, now: () => '2026-10-31' });
  assert.equal(receipt.status, 'pass');
  assert.equal(calls.length, 3);
  assert.equal(calls[1].command, 'git');
  assert.equal(calls[1].args[0], 'status');
  assert.equal(calls[2].command, 'node');
  assert.equal(calls[2].opts.shell, false);
  assert.equal(calls[2].opts.env.GITHUB_TOKEN, undefined);
});

test('modified tracked source blocks exact-SHA proof before any mission runs', () => {
  const calls = [];
  const spawn = (command, args) => {
    calls.push({ command, args });
    if (args[0] === 'rev-parse') return { status: 0, stdout: sha + '\n', stderr: '' };
    if (args[0] === 'status') return { status: 0, stdout: ' M scripts/bip-sprite-proof.mjs\n', stderr: '' };
    throw new Error('mission must not run on dirty source');
  };
  assert.throws(() => runProof({ mission: 'repo-truth', sha }, { spawn }), /BIP_SPRITE_DIRTY_CHECKOUT/);
  assert.equal(calls.length, 2);
});

test('source cleanliness probe failures block proof rather than passing', () => {
  const calls = [];
  const spawn = (command, args) => {
    calls.push({ command, args });
    if (args[0] === 'rev-parse') return { status: 0, stdout: sha + '\n', stderr: '' };
    if (args[0] === 'status') return { status: 128, stdout: '', stderr: 'probe failed' };
    throw new Error('mission must not run if source cleanliness is unknown');
  };
  assert.throws(() => runProof({ mission: 'agent-contract', sha }, { spawn }), /BIP_SPRITE_DIRTY_CHECK_FAILED/);
  assert.equal(calls.length, 2);
});

test('invocation-specific requests bind a non-guessable receipt identity', () => {
  const invocationId = '1'.repeat(32);
  const parsed = parseRequest(['--mission', 'repo-truth', '--sha', sha, '--invocation', invocationId]);
  assert.deepEqual(parsed, { mission: 'repo-truth', sha, invocationId });
  for (const invalid of ['short', 'z'.repeat(32), '../escape', 'A'.repeat(32)]) {
    assert.throws(() => parseRequest(['--mission', 'repo-truth', '--sha', sha, '--invocation', invalid]));
  }
  assert.throws(() => parseRequest(['--mission', 'repo-truth', '--sha', sha, '--invocation', invocationId, 'extra']));
  const result = receiptFor({
    ...parsed, result: { status: 0, stdout: '', stderr: '' },
    startedAt: '2026-11-02T00:00:00.000Z', finishedAt: '2026-11-02T00:00:01.000Z',
  });
  assert.equal(result.invocationId, invocationId);
  assert.equal(result.authority.deploy, false);
});

test('unique invocation flows through clean exact-head proof', () => {
  const invocationId = 'b'.repeat(32);
  let calls = 0;
  const spawn = () => {
    calls++;
    if (calls === 1) return { status: 0, stdout: sha + '\n', stderr: '' };
    if (calls === 2) return { status: 0, stdout: '', stderr: '' };
    return { status: 0, stdout: 'pass', stderr: '' };
  };
  const receipt = runProof({ mission: 'agent-contract', sha, invocationId }, { spawn, now: () => '2026-11-02T00:00:00Z' });
  assert.equal(receipt.invocationId, invocationId);
  assert.equal(receipt.status, 'pass');
  assert.equal(calls, 3);
});
