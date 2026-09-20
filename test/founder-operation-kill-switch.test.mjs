import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import {
  evaluateFounderOperationKillSwitch,
  founderKillSwitchReason,
  parseFounderOperationKillSwitch,
  stableHttpOperationId,
} from '../shared/founder-operation-kill-switch.js';

function decision(rawValue, scope = 'companion', operation = 'sekret:reply', rawReason = 'incident_review') {
  return evaluateFounderOperationKillSwitch({ rawValue, rawReason, scope, operation });
}

test('kill switch is off by default and with explicit off values', () => {
  for (const value of [undefined, '', 'off', 'disabled', '0', 'false']) {
    assert.equal(decision(value).blocked, false);
    assert.equal(parseFounderOperationKillSwitch(value).engaged, false);
  }
});

test('all blocks every guarded operation', () => {
  assert.equal(decision('all').blocked, true);
  assert.equal(decision('all', 'control-room', 'mission:verify-frontend').blocked, true);
});

test('scope target blocks only its scope', () => {
  assert.equal(decision('scope:companion').blocked, true);
  assert.equal(decision('scope:companion', 'bridge', 'bridge:summary-generate').blocked, false);
});

test('operation target blocks only the exact stable operation id', () => {
  assert.equal(decision('op:sekret:reply').blocked, true);
  assert.equal(decision('op:sekret:reply', 'companion', 'sekret:voice').blocked, false);
  assert.equal(decision('op:mission:verify-frontend', 'control-room', 'mission:verify-frontend').blocked, true);
});

test('multiple targets compose without broadening unrelated operations', () => {
  const raw = 'op:sekret:voice,scope:bridge,op:mission:verify-local';
  assert.equal(decision(raw, 'companion', 'sekret:voice').blocked, true);
  assert.equal(decision(raw, 'bridge', 'bridge:summary-generate').blocked, true);
  assert.equal(decision(raw, 'control-room', 'mission:verify-local').blocked, true);
  assert.equal(decision(raw, 'companion', 'sekret:reply').blocked, false);
});

test('malformed non-empty configuration fails closed instead of silently allowing', () => {
  for (const value of ['companion', 'scope:', 'wat:reply', 'op:bad value']) {
    const parsed = parseFounderOperationKillSwitch(value);
    assert.equal(parsed.engaged, true);
    assert.equal(parsed.invalid, true);
    assert.equal(decision(value).blocked, true);
  }
});

test('reason codes cannot leak arbitrary environment text', () => {
  assert.equal(founderKillSwitchReason('incident_review'), 'incident_review');
  assert.equal(founderKillSwitchReason('contains private words and spaces'), 'founder_pause');
  assert.equal(founderKillSwitchReason('X'.repeat(200)), 'founder_pause');
});

test('generic HTTP operation ids are stable and bounded', () => {
  assert.equal(stableHttpOperationId('POST', '/api/something/do-it'), 'http:post:api-something-do-it');
  assert.match(stableHttpOperationId('GET', '/'), /^http:get:root$/);
});

test('generic repo-operation gate can guard any stable scope and operation id', () => {
  const script = new URL('../scripts/founder-operation-gate.mjs', import.meta.url);
  const allowed = spawnSync(process.execPath, [script.pathname, 'provider', 'supabase:migrations'], {
    encoding: 'utf8',
    env: { ...process.env, FOUNDER_OPERATION_KILL_SWITCH: 'off' },
  });
  assert.equal(allowed.status, 0);
  assert.match(allowed.stdout, /FOUNDER_OPERATION_ALLOWED/);

  const blocked = spawnSync(process.execPath, [script.pathname, 'provider', 'supabase:migrations'], {
    encoding: 'utf8',
    env: { ...process.env, FOUNDER_OPERATION_KILL_SWITCH: 'op:supabase:migrations' },
  });
  assert.equal(blocked.status, 75);
  assert.match(blocked.stderr, /FOUNDER_OPERATION_PAUSED/);
});

test('production worker is wrapped by the founder guard entrypoint', () => {
  const wrangler = fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const wrapper = fs.readFileSync(new URL('../worker/founder-guard-entry.ts', import.meta.url), 'utf8');
  assert.match(wrangler, /main = "worker\/founder-guard-entry\.ts"/);
  assert.match(wrapper, /operation: 'sekret:reply'/);
  assert.match(wrapper, /operation: 'sekret:voice'/);
  assert.match(wrapper, /operation: 'sekret:transcribe'/);
  assert.match(wrapper, /operation: 'bridge:summary-generate'/);
  assert.match(wrapper, /operation: 'email:inbound'/);
  assert.match(wrapper, /FOUNDER_OPERATION_PAUSED/);
  assert.doesNotMatch(wrapper, /scope: decision\.scope,\n\s+operation: decision\.operation,\n\s+reason: decision\.reason,\n\s+}\), \{/);
});

test('direct Control Room mission execution checks the same founder switch before spawn', () => {
  const agent = fs.readFileSync(new URL('../scripts/control-room-agent.mjs', import.meta.url), 'utf8');
  const guardIndex = agent.indexOf('evaluateFounderOperationKillSwitch');
  const spawnIndex = agent.indexOf('spawnSync(mission.command');
  assert.ok(guardIndex >= 0);
  assert.ok(spawnIndex > guardIndex);
  assert.match(agent, /scope: 'control-room'/);
  assert.match(agent, /operation: `mission:\$\{missionId\}`/);
  assert.match(agent, /process\.exit\(75\)/);
});

test('client preserves founder pause as a non-retryable error instead of voice failure', () => {
  const contract = fs.readFileSync(new URL('../src/contracts/sekretApi.ts', import.meta.url), 'utf8');
  const client = fs.readFileSync(new URL('../src/services/backend/sekretClient.ts', import.meta.url), 'utf8');
  assert.match(contract, /\| 'FOUNDER_PAUSED'/);
  assert.match(client, /serverCode === FOUNDER_PAUSE_CODE\) return 'FOUNDER_PAUSED'/);
  assert.match(client, /serverCode === FOUNDER_PAUSE_CODE\) return false/);
  assert.match(client, /typeof body\.retryable === 'boolean'/);
});
