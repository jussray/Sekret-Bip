import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/control-room-test-ledger.yml', 'utf8');

test('Control Room Test Ledger workflow is exact-head, credential-minimal, and action-pinned', () => {
  for (const required of [
    'EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'ref: ${{ env.EXPECTED_HEAD_SHA }}',
    'persist-credentials: false',
    'test "$actual" = "$EXPECTED_HEAD_SHA"',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    'GITHUB_TOKEN: ${{ github.token }}',
    'name: control-room-test-ledger-${{ env.EXPECTED_HEAD_SHA }}',
  ]) {
    assert.ok(workflow.includes(required), `missing test-ledger workflow contract: ${required}`);
  }

  assert.equal(
    (workflow.match(/persist-credentials: false/g) || []).length,
    2,
    'both checkout steps must disable persisted credentials',
  );
  assert.ok(!/uses:\s+actions\/(?:checkout|setup-node|upload-artifact)@v\d+/u.test(workflow), 'test-ledger actions must be SHA-pinned');
  assert.ok(!workflow.includes('persist-credentials: true'), 'test-ledger checkout credentials must not persist');
});
