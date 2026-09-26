import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const token = 'b'.repeat(64);

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(error => error ? reject(error) : resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`server exited early: ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('server health timeout');
}

function buildPlan({ evidenceLevel = 'plan-only', verified = false, approvalVerified = false, createdAt = new Date(Date.now() - 1_000).toISOString() } = {}) {
  const id = '20260724083600000-founder-test';
  const lanes = [
    { id: 'founder', label: 'Founder', purpose: 'Own approvals and final truth.', authority: 'decision' },
    { id: 'chatgpt', label: 'ChatGPT', purpose: 'Build the mission and artifact plan.', authority: 'execution' },
    { id: 'playwright', label: 'Playwright', purpose: 'Retain executed browser evidence.', authority: 'evidence' },
    { id: 'local-agent', label: 'Local Agent', purpose: 'Run only fixed local verification missions.', authority: 'execution' },
  ];
  const prefix = `reports/control-room/founder-operator/${id}/`;
  const artifacts = [
    { id: 'mission-brief', title: 'Mission brief', kind: 'mission-brief', ownerLane: 'chatgpt', supportLanes: ['founder'], pathHint: `${prefix}mission.md`, evidenceRequired: ['5W1H scope'], status: 'planned' },
    { id: 'system-map', title: 'System map', kind: 'architecture', ownerLane: 'chatgpt', supportLanes: ['founder'], pathHint: `${prefix}system.md`, evidenceRequired: ['dependencies'], status: 'planned' },
    { id: 'verification-report', title: 'Verification report', kind: 'verification', ownerLane: 'playwright', supportLanes: ['local-agent'], pathHint: `${prefix}verification.json`, evidenceRequired: ['executed checks'], status: verified ? 'verified' : 'planned' },
    { id: 'founder-decision', title: 'Founder decision', kind: 'release', ownerLane: 'founder', supportLanes: ['chatgpt'], pathHint: `${prefix}decision.md`, evidenceRequired: ['approval state'], approvalGate: 'Founder approval is required before external mutation.', status: approvalVerified ? 'verified' : 'human-required' },
  ];
  const phases = [
    { id: 'observe', title: 'Observe', objective: 'Lock mission and current truth.', operatingQuestion: 'What is true right now?', ownerLane: 'chatgpt', supportLanes: ['founder'], artifactIds: ['mission-brief'], safeMissionId: 'continue-yesterday', exitGate: 'Mission truth is explicit.', status: 'planned' },
    { id: 'orient', title: 'Orient', objective: 'Map the complete system.', operatingQuestion: 'Which dependency can invalidate the plan?', ownerLane: 'chatgpt', supportLanes: ['founder'], artifactIds: ['system-map'], exitGate: 'Dependencies are explicit.', status: 'planned' },
    { id: 'verify', title: 'Verify', objective: 'Execute retained evidence.', operatingQuestion: 'What actually ran?', ownerLane: 'playwright', supportLanes: ['local-agent'], artifactIds: ['verification-report'], safeMissionId: 'verify-local', exitGate: 'Executed evidence is retained.', status: verified ? 'verified' : 'planned' },
    { id: 'decide', title: 'Decide', objective: 'Stop at the founder gate.', operatingQuestion: 'Does evidence justify external action?', ownerLane: 'founder', supportLanes: ['chatgpt'], artifactIds: ['founder-decision'], exitGate: 'Founder records the decision.', status: 'human-required' },
  ];
  return {
    schemaVersion: 1,
    id,
    createdAt,
    mission: 'Verify the Founder Operator persistence boundary.',
    constraints: 'Do not merge, deploy, publish, use secrets, or delete data.',
    modes: ['ultrathink', 'billgates-artifacts', 'elonmusk-execution'],
    lanes,
    phases,
    artifacts,
    approvalGates: ['Founder approval is required before external mutation.'],
    nonClaims: ['A plan is not executed evidence.'],
    evidenceLevel,
  };
}

async function post(port, pathname, body) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('Founder Operator persistence is fixed-path, versioned, and server-attested', async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-operator-server-'));
  const scripts = path.join(temp, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync('scripts/control-room-server.mjs', path.join(scripts, 'control-room-server.mjs'));
  fs.writeFileSync(path.join(scripts, 'control-room-agent.mjs'), `
    const mission = process.argv[2];
    if (!['continue-yesterday', 'verify-local', 'verify-frontend', 'recover-system'].includes(mission)) process.exit(64);
    console.log('executed:' + mission);
    process.exit(0);
  `);

  const port = await getPort();
  const server = spawn(process.execPath, ['scripts/control-room-server.mjs'], {
    cwd: temp,
    env: { ...process.env, CONTROL_ROOM_LOCAL_PORT: String(port), CONTROL_ROOM_LOCAL_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (server.exitCode == null) server.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  });
  await waitForHealth(port, server);

  const planOnly = buildPlan();
  const first = await post(port, '/founder-operator/plans', planOnly);
  assert.equal(first.response.status, 201);
  assert.match(first.body.reportPath, /founder-operator\/20260724083600000-founder-test\.json$/);
  assert.equal(first.body.localMissionEvidence, null);
  const firstRecord = JSON.parse(fs.readFileSync(path.join(temp, first.body.reportPath), 'utf8'));
  assert.equal(firstRecord.plan.evidenceLevel, 'plan-only');
  assert.equal(firstRecord.localMissionEvidence, null);

  const second = await post(port, '/founder-operator/plans', planOnly);
  assert.equal(second.response.status, 201);
  assert.match(second.body.reportPath, /-v2\.json$/);

  const premature = await post(port, '/founder-operator/plans', buildPlan({ evidenceLevel: 'local-evidence', verified: true }));
  assert.equal(premature.response.status, 400);
  assert.equal(premature.body.error, 'unexecuted_local_evidence');

  const verifyRun = await post(port, '/missions/verify-local', {});
  assert.equal(verifyRun.response.status, 200);
  assert.equal(verifyRun.body.status, 'passed');

  const certified = await post(port, '/founder-operator/plans', buildPlan({ evidenceLevel: 'local-evidence', verified: true }));
  assert.equal(certified.response.status, 201);
  assert.equal(certified.body.localMissionEvidence.missionId, 'verify-local');
  assert.equal(certified.body.localMissionEvidence.status, 'passed');

  const approvalLie = await post(port, '/founder-operator/plans', buildPlan({ approvalVerified: true }));
  assert.equal(approvalLie.response.status, 400);
  assert.equal(approvalLie.body.error, 'approval_gated_artifact_cannot_be_verified');

  const unsupported = await post(port, '/founder-operator/plans', { ...planOnly, evidenceLevel: 'exact-head' });
  assert.equal(unsupported.response.status, 400);
  assert.equal(unsupported.body.error, 'unsupported_evidence_level');

  const credential = await post(port, '/founder-operator/plans', { ...planOnly, mission: 'Use ghp_123456789012345678901234567890123456 safely.' });
  assert.equal(credential.response.status, 400);
  assert.equal(credential.body.error, 'credential_shaped_content_rejected');
});