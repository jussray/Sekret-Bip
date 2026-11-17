import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const panel = fs.readFileSync(
  new URL('../src/features/control-room/GuardianReviewsPanel.tsx', import.meta.url),
  'utf8',
);

const applyDecision = panel.match(
  /async function applyDecision\(\)[\s\S]*?\n  }\n\n  if \(loading\)/,
)?.[0];

test('guardian review requires review and confirmation phases', () => {
  assert.match(panel, /phase: 'review'/);
  assert.match(panel, /phase: 'confirm'/);
  assert.match(panel, /Review final action/);
  assert.match(panel, /CONFIRM LIVE RPC/);
});

test('rejection requires a reason before confirmation', () => {
  assert.match(panel, /!gate\.approve && !gate\.note\.trim\(\)/);
  assert.match(panel, /A reason is required before rejecting a guardian review/);
});

test('live RPC remains founder-authorized and separate from parent linking', () => {
  assert.match(panel, /isFounderProfile\(founder\)/);
  assert.match(panel, /founder\.can_manage_app/);
  assert.match(panel, /rpc\('list_guardian_verification_queue'\)/);
  assert.match(panel, /rpc\('review_guardian_verification'/);
  assert.match(panel, /does not create a parent–teen link/i);
  assert.doesNotMatch(panel, /rpc\('can_manage_guardian_reviews'\)/);
});

test('failed live decisions preserve the confirmation context', () => {
  assert.ok(applyDecision, 'Expected applyDecision function source.');
  const rpcIndex = applyDecision.indexOf("rpc('review_guardian_verification'");
  const successResetIndex = applyDecision.indexOf("setGate({ phase: 'idle' })");
  const catchIndex = applyDecision.indexOf('} catch (caught) {');

  assert.ok(rpcIndex >= 0, 'Expected live review RPC.');
  assert.ok(successResetIndex > rpcIndex, 'Gate must reset only after the RPC succeeds.');
  assert.ok(catchIndex > successResetIndex, 'Success reset must remain inside the try block.');
  assert.doesNotMatch(
    applyDecision.slice(catchIndex),
    /setGate\(\{ phase: 'idle' \}\)/,
  );
});

test('busy state blocks duplicate confirmation submissions', () => {
  assert.match(panel, /gate\.phase !== 'confirm' \|\| busyId/);
  assert.match(panel, /disabled=\{busy\}/);
  assert.match(panel, /setBusyId\(row\.target_user_id\)/);
  assert.match(panel, /setBusyId\(null\)/);
});
