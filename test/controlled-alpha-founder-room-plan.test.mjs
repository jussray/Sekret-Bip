import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const planPath = new URL(
  '../reports/control-room/founder-operator/20260718-controlled-alpha-activation.json',
  import.meta.url,
);

async function loadPlan() {
  return JSON.parse(await readFile(planPath, 'utf8'));
}

function walkKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkKeys(item, keys));
    return keys;
  }
  if (!value || typeof value !== 'object') return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.push(key.toLowerCase().replace(/[^a-z0-9]/g, ''));
    walkKeys(nested, keys);
  }
  return keys;
}

test('Founder Room keeps the controlled-alpha execution phases in order', async () => {
  const plan = await loadPlan();

  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.id, '20260718-controlled-alpha-activation');
  assert.deepEqual(plan.modes, [
    'ultrathink',
    'billgates-artifacts',
    'elonmusk-execution',
  ]);
  assert.deepEqual(
    plan.phases.map((phase) => phase.id),
    ['observe', 'orient', 'artifact-plan', 'execute', 'verify', 'decide'],
  );
  assert.equal(plan.phases[0].status, 'active');
  assert.equal(plan.phases.at(-1).status, 'human-required');
  assert.equal(plan.evidenceLevel, 'plan-only');
});

test('Founder Room artifact references and evidence paths remain internally consistent', async () => {
  const plan = await loadPlan();
  const artifactIds = new Set(plan.artifacts.map((artifact) => artifact.id));
  const laneIds = new Set(plan.lanes.map((lane) => lane.id));
  const expectedPrefix = `reports/control-room/founder-operator/${plan.id}/`;

  assert.equal(artifactIds.size, plan.artifacts.length);
  assert.equal(laneIds.size, plan.lanes.length);

  for (const phase of plan.phases) {
    assert.ok(laneIds.has(phase.ownerLane));
    phase.supportLanes.forEach((lane) => assert.ok(laneIds.has(lane)));
    phase.artifactIds.forEach((artifactId) => assert.ok(artifactIds.has(artifactId)));
  }

  for (const artifact of plan.artifacts) {
    assert.ok(laneIds.has(artifact.ownerLane));
    artifact.supportLanes.forEach((lane) => assert.ok(laneIds.has(lane)));
    assert.ok(artifact.pathHint.startsWith(expectedPrefix));
    assert.doesNotMatch(artifact.pathHint, /\.\.|\\/);
    if (artifact.approvalGate) assert.notEqual(artifact.status, 'verified');
  }
});

test('Founder Room preserves privacy, authority, and infrastructure truth boundaries', async () => {
  const plan = await loadPlan();
  const blockedKeys = new Set([
    'password',
    'passphrase',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'apikey',
    'secret',
    'clientsecret',
    'servicerole',
    'authorization',
    'cookie',
    'session',
  ]);

  for (const key of walkKeys(plan)) assert.equal(blockedKeys.has(key), false);

  assert.ok(plan.nonClaims.some((claim) => claim.includes('Zero-step GitHub Actions failures')));
  assert.ok(plan.nonClaims.some((claim) => claim.includes('dedicated alpha Worker is deployed')));
  assert.ok(plan.nonClaims.some((claim) => claim.includes('does not itself execute')));
  assert.ok(plan.approvalGates.some((gate) => gate.includes('credentials')));
  assert.ok(plan.approvalGates.some((gate) => gate.includes('deleting')));
  assert.ok(plan.approvalGates.some((gate) => gate.includes('opening the controlled alpha')));
});
