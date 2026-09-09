import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEDERATED_PROOF_CONTRACT,
  createJussProofFromTestLedger,
} from '../scripts/control-room-juss-proof.mjs';

const SHA = '579342699fc7fb394cf9684643756cdc8c9342a8';
const RECEIPT_ID = '123e4567-e89b-42d3-a456-426614174000';
const ISSUED_AT = '2026-08-24T15:30:00.000Z';

function ledger(overrides = {}) {
  return {
    schemaVersion: 1,
    repository: 'jussray/Sekret-Bip',
    commitSha: SHA,
    branch: 'fix/example',
    generatedAt: ISSUED_AT,
    source: {
      provider: 'github-check-runs',
      exactRef: 'commit-sha',
    },
    runner: {
      provider: 'github-actions',
      observerState: 'stable',
    },
    aggregate: {
      state: 'passed',
      counts: {
        total: 3,
        passed: 3,
        failed: 0,
        queued: 0,
        running: 0,
        skipped: 0,
        unknown: 0,
      },
    },
    checks: [
      {
        name: 'Repository Truth',
        app: 'github-actions',
        state: 'passed',
        detailsUrl: 'https://github.com/jussray/Sekret-Bip/actions/runs/1',
      },
    ],
    ...overrides,
  };
}

test('normalizes an exact-head ledger into a sanitized juss-proof/v1 receipt', () => {
  const source = ledger();
  const receipt = createJussProofFromTestLedger(source, {
    receiptId: RECEIPT_ID,
    issuedAt: ISSUED_AT,
  });

  assert.equal(receipt.schema, FEDERATED_PROOF_CONTRACT);
  assert.equal(receipt.receiptId, RECEIPT_ID);
  assert.equal(receipt.project, 'jussray/Sekret-Bip');
  assert.deepEqual(receipt.authority, {
    provider: 'github',
    scope: 'repository',
    target: 'jussray/Sekret-Bip',
    mode: 'verify',
  });
  assert.deepEqual(receipt.exactTarget, {
    repository: 'jussray/Sekret-Bip',
    branch: 'fix/example',
    sha: SHA,
  });
  assert.equal(receipt.operation, 'exact_head_test_ledger');
  assert.equal(receipt.state, 'verified');
  assert.equal(receipt.nextAuthority, 'runtime-provider-mcp');
  assert.equal(receipt.evidence.length, 2);
  assert.equal(receipt.evidence[0].type, 'control_room_test_ledger');
  assert.match(receipt.evidence[0].sha256, /^[0-9a-f]{64}$/);
  assert.equal(receipt.evidence[1].type, 'github_check_aggregate');

  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes('Repository Truth'), false);
  assert.equal(serialized.includes('actions/runs/1'), false);
});

test('maps warning ledgers to inferred rather than verified', () => {
  const source = ledger({
    aggregate: {
      state: 'warning',
      counts: {
        total: 3,
        passed: 2,
        failed: 0,
        queued: 0,
        running: 0,
        skipped: 1,
        unknown: 0,
      },
    },
  });

  const receipt = createJussProofFromTestLedger(source, {
    receiptId: RECEIPT_ID,
    issuedAt: ISSUED_AT,
  });
  assert.equal(receipt.state, 'inferred');
  assert.equal(receipt.evidence.every((item) => item.state === 'inferred'), true);
});

test('fails closed when exact commit identity is missing', () => {
  assert.throws(
    () => createJussProofFromTestLedger(ledger({commitSha: 'short'}), {
      receiptId: RECEIPT_ID,
      issuedAt: ISSUED_AT,
    }),
    /full 40-character SHA/,
  );
});
