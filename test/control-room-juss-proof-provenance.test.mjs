import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createJussProofFromTestLedger,
  emitJussProofFromTestLedger,
} from '../scripts/control-room-juss-proof.mjs';

const SHA = '579342699fc7fb394cf9684643756cdc8c9342a8';
const CURRENT_ID = '123e4567-e89b-42d3-a456-426614174000';
const PREVIOUS_ID = '223e4567-e89b-42d3-a456-426614174000';
const ISSUED_AT = '2026-08-24T15:30:00.000Z';
const PREVIOUS_AT = '2026-08-24T15:00:00.000Z';

function baseLedger() {
  return {
    schemaVersion: 1,
    repository: 'jussray/Sekret-Bip',
    commitSha: SHA,
    branch: 'feat/actual-flow-v4-provenance',
    generatedAt: ISSUED_AT,
    source: {provider: 'github-check-runs', exactRef: 'commit-sha'},
    runner: {provider: 'github-actions', observerState: 'stable'},
    aggregate: {
      state: 'passed',
      counts: {total: 3, passed: 3, failed: 0, queued: 0, running: 0, skipped: 0, unknown: 0},
    },
    checks: [],
  };
}

function compatiblePrevious(overrides = {}) {
  return {
    schema: 'juss-proof/v1',
    receiptId: PREVIOUS_ID,
    project: 'jussray/Sekret-Bip',
    actor: 'sekret-bip-control-room',
    authority: {
      provider: 'github',
      scope: 'repository',
      target: 'jussray/Sekret-Bip',
      mode: 'verify',
    },
    exactTarget: {
      repository: 'jussray/Sekret-Bip',
      sha: SHA,
    },
    operation: 'exact_head_test_ledger',
    state: 'verified',
    evidence: [],
    acknowledges: [],
    dependsOn: [],
    supersedes: [],
    issuedAt: PREVIOUS_AT,
    ...overrides,
  };
}

function withTempProofFiles(previous) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-juss-proof-'));
  const ledgerPath = path.join(root, 'ledger.json');
  const previousPath = path.join(root, 'previous.json');
  const outputPath = path.join(root, 'output.json');
  fs.writeFileSync(ledgerPath, `${JSON.stringify(baseLedger())}\n`, 'utf8');
  fs.writeFileSync(previousPath, `${JSON.stringify(previous)}\n`, 'utf8');
  return {ledgerPath, previousPath, outputPath};
}

test('juss-proof evidence digest is canonical across object key order', () => {
  const a = baseLedger();
  const b = {
    checks: [],
    aggregate: a.aggregate,
    runner: a.runner,
    source: a.source,
    generatedAt: a.generatedAt,
    branch: a.branch,
    commitSha: a.commitSha,
    repository: a.repository,
    schemaVersion: a.schemaVersion,
  };

  const receiptA = createJussProofFromTestLedger(a, {receiptId: CURRENT_ID, issuedAt: ISSUED_AT});
  const receiptB = createJussProofFromTestLedger(b, {receiptId: CURRENT_ID, issuedAt: ISSUED_AT});
  assert.equal(receiptA.evidence[0].sha256, receiptB.evidence[0].sha256);
});

test('juss-proof can explicitly supersede a prior compatible receipt', () => {
  const receipt = createJussProofFromTestLedger(baseLedger(), {
    receiptId: CURRENT_ID,
    issuedAt: ISSUED_AT,
    supersedes: [PREVIOUS_ID],
  });
  assert.deepEqual(receipt.supersedes, [PREVIOUS_ID]);
});

test('juss-proof rejects malformed or self-referential supersession IDs', () => {
  assert.throws(
    () => createJussProofFromTestLedger(baseLedger(), {
      receiptId: CURRENT_ID,
      issuedAt: ISSUED_AT,
      supersedes: ['not-a-receipt'],
    }),
    /invalid receipt ID/,
  );

  assert.throws(
    () => createJussProofFromTestLedger(baseLedger(), {
      receiptId: CURRENT_ID,
      issuedAt: ISSUED_AT,
      supersedes: [CURRENT_ID],
    }),
    /unique non-self receipt IDs/,
  );
});

test('environment-driven supersession accepts an older compatible receipt', () => {
  const {ledgerPath, previousPath, outputPath} = withTempProofFiles(compatiblePrevious());
  const receipt = emitJussProofFromTestLedger({
    CONTROL_ROOM_TEST_LEDGER_PATH: ledgerPath,
    CONTROL_ROOM_PREVIOUS_JUSS_PROOF_PATH: previousPath,
    CONTROL_ROOM_JUSS_PROOF_PATH: outputPath,
  });
  assert.deepEqual(receipt.supersedes, [PREVIOUS_ID]);
  assert.equal(fs.existsSync(outputPath), true);
});

test('environment-driven supersession rejects a receipt from another project', () => {
  const {ledgerPath, previousPath, outputPath} = withTempProofFiles(compatiblePrevious({
    project: 'jussray/another-project',
    exactTarget: {
      repository: 'jussray/another-project',
      sha: SHA,
    },
  }));

  assert.throws(
    () => emitJussProofFromTestLedger({
      CONTROL_ROOM_TEST_LEDGER_PATH: ledgerPath,
      CONTROL_ROOM_PREVIOUS_JUSS_PROOF_PATH: previousPath,
      CONTROL_ROOM_JUSS_PROOF_PATH: outputPath,
    }),
    /different project/,
  );
  assert.equal(fs.existsSync(outputPath), false);
});

test('environment-driven supersession rejects incompatible authority and operation', () => {
  for (const previous of [
    compatiblePrevious({authority: {provider: 'github', scope: 'deployment', target: 'jussray/Sekret-Bip', mode: 'verify'}}),
    compatiblePrevious({operation: 'deployment_observation'}),
  ]) {
    const {ledgerPath, previousPath, outputPath} = withTempProofFiles(previous);
    assert.throws(
      () => emitJussProofFromTestLedger({
        CONTROL_ROOM_TEST_LEDGER_PATH: ledgerPath,
        CONTROL_ROOM_PREVIOUS_JUSS_PROOF_PATH: previousPath,
        CONTROL_ROOM_JUSS_PROOF_PATH: outputPath,
      }),
      /incompatible/,
    );
    assert.equal(fs.existsSync(outputPath), false);
  }
});

test('environment-driven supersession rejects a newer or same-time prior receipt', () => {
  for (const issuedAt of [ISSUED_AT, '2026-08-24T16:00:00.000Z']) {
    const {ledgerPath, previousPath, outputPath} = withTempProofFiles(compatiblePrevious({issuedAt}));
    assert.throws(
      () => emitJussProofFromTestLedger({
        CONTROL_ROOM_TEST_LEDGER_PATH: ledgerPath,
        CONTROL_ROOM_PREVIOUS_JUSS_PROOF_PATH: previousPath,
        CONTROL_ROOM_JUSS_PROOF_PATH: outputPath,
      }),
      /must be older/,
    );
    assert.equal(fs.existsSync(outputPath), false);
  }
});
