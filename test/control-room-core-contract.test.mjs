import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const server = fs.readFileSync('scripts/control-room-server.mjs', 'utf8');
const agent = fs.readFileSync('scripts/control-room-agent.mjs', 'utf8');
const client = fs.readFileSync('src/services/controlRoomLocalAgent.ts', 'utf8');
const frontend = fs.readFileSync('scripts/control-room-verify-frontend.mjs', 'utf8');

test('loopback server is token gated and command allowlisted', () => {
  assert.match(server, /const host = '127\.0\.0\.1'/);
  assert.match(server, /token\.length < 32/);
  assert.match(server, /allowedMissions = new Set/);
  assert.match(server, /mission_not_allowed/);
  assert.match(server, /mission_already_running/);
  assert.doesNotMatch(server, /spawn\([^\n]*req\./);
  assert.doesNotMatch(server, /new RegExp\([^\n]*authorization/i);
  assert.match(agent, /Unknown or disallowed mission/);
  assert.match(client, /FounderOperatorPlan/);
  assert.match(server, /founder-operator\/plans/);
  assert.doesNotMatch(server, /spawn\([^\n]*plan/);
});

test('timeout targets the complete process tree and retains the lock until it stops', () => {
  assert.match(server, /detached: process\.platform !== 'win32'/);
  assert.match(server, /process\.kill\(-child\.pid, signal\)/);
  assert.match(server, /processTreeAlive/);
  assert.match(server, /finishWhenTreeStops/);
  assert.match(server, /SIGTERM/);
  assert.match(server, /SIGKILL/);
  assert.match(server, /activeMission = null/);
});

test('frontend verification uses a timestamped artifact directory without overriding reporters', () => {
  assert.match(frontend, /PLAYWRIGHT_ARTIFACT_DIR/);
  assert.match(frontend, /reports', 'control-room', 'playwright'/);
  assert.match(frontend, /\['playwright', 'test'\]/);
  assert.doesNotMatch(frontend, /--reporter=/);
  assert.match(frontend, /results\.json/);
  assert.match(frontend, /non-browser-fallback/);
  assert.match(frontend, /must not be described as browser/);
});