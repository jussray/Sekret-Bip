import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Firebase App Check checked-in rollout state passes the source readiness gate', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-firebase-app-check-rollout.mjs'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.ok, true);
  assert.ok(['off', 'observe'].includes(receipt.mode));
  assert.equal(receipt.enforcementAuthorized, false);
  assert.equal(typeof receipt.providerRegistered, 'boolean');
  assert.equal(typeof receipt.readiness, 'string');

  if (!receipt.providerRegistered) {
    assert.equal(receipt.readiness, 'foundation-only');
  }
  if (receipt.mode === 'observe') {
    assert.equal(receipt.providerRegistered, true);
    assert.equal(receipt.readiness, 'client-seam-wired');
  }
});