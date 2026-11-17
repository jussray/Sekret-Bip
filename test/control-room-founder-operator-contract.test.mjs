import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const server = fs.readFileSync('scripts/control-room-server.mjs', 'utf8');
const client = fs.readFileSync('src/services/controlRoomLocalAgent.ts', 'utf8');

test('server attests local evidence instead of trusting browser JSON', () => {
  assert.match(server, /certifiedLocalRunFor/);
  assert.match(server, /unexecuted_local_evidence/);
  assert.match(server, /latestRun\.status !== 'passed'/);
  assert.match(server, /\['verify-local', 'verify-frontend'\]/);
  assert.match(server, /approval_gated_artifact_cannot_be_verified/);
  assert.match(server, /unsupported_evidence_level/);
  assert.match(server, /localMissionEvidence/);
});

test('client supports plan persistence but not arbitrary paths or commands', () => {
  assert.match(client, /persistFounderOperatorPlan/);
  assert.match(client, /\/founder-operator\/plans/);
  assert.match(client, /body: JSON\.stringify\(plan\)/);
  assert.doesNotMatch(client, /destinationPath|filesystemPath|outputPath/);
  assert.doesNotMatch(client, /command\s*:/);
});