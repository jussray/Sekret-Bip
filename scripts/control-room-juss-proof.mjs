import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';

import {canonicalSha256} from './control-room-provenance.mjs';

export const FEDERATED_PROOF_CONTRACT = 'juss-proof/v1';

const FULL_SHA = /^[0-9a-f]{40}$/i;
const RECEIPT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPOSITORY = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const TERMINAL_STATE = new Set(['verified', 'inferred', 'unknown', 'failed', 'blocked']);
const PROOF_OPERATION = 'exact_head_test_ledger';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalTimestamp(value) {
  const parsed = new Date(value ?? '');
  if (!clean(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('Control Room ledger generatedAt must be a canonical ISO timestamp.');
  }
  return parsed.toISOString();
}

function proofState(aggregateState) {
  switch (aggregateState) {
    case 'passed':
      return 'verified';
    case 'warning':
      return 'inferred';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'unknown';
    case 'unknown':
    default:
      return 'unknown';
  }
}

function assertLedger(ledger) {
  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) {
    throw new Error('Control Room ledger must be an object.');
  }
  if (!REPOSITORY.test(clean(ledger.repository))) {
    throw new Error('Control Room ledger repository must use owner/repo format.');
  }
  if (!FULL_SHA.test(clean(ledger.commitSha))) {
    throw new Error('Control Room ledger commitSha must be a full 40-character SHA.');
  }
  canonicalTimestamp(ledger.generatedAt);
  if (!ledger.aggregate || typeof ledger.aggregate !== 'object') {
    throw new Error('Control Room ledger aggregate is required.');
  }
  if (!TERMINAL_STATE.has(proofState(ledger.aggregate.state))) {
    throw new Error('Control Room ledger aggregate state is unsupported.');
  }
  const counts = ledger.aggregate.counts;
  if (!counts || typeof counts !== 'object') {
    throw new Error('Control Room ledger aggregate counts are required.');
  }
  for (const key of ['total', 'passed', 'failed', 'queued', 'running', 'skipped', 'unknown']) {
    if (!Number.isInteger(counts[key]) || counts[key] < 0) {
      throw new Error(`Control Room ledger count ${key} must be a non-negative integer.`);
    }
  }
}

function normalizeReceiptReferences(value, selfId) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50) {
    throw new Error('Control Room supersedes must be an array of at most 50 receipt IDs.');
  }
  const normalized = value.map((item) => {
    const id = clean(item).toLowerCase();
    if (!RECEIPT_ID.test(id)) {
      throw new Error('Control Room supersedes contains an invalid receipt ID.');
    }
    return id;
  });
  if (new Set(normalized).size !== normalized.length || normalized.includes(selfId.toLowerCase())) {
    throw new Error('Control Room supersedes must contain unique non-self receipt IDs.');
  }
  return normalized;
}

function ledgerSha256(ledger) {
  return canonicalSha256(ledger);
}

export function createJussProofFromTestLedger(ledger, options = {}) {
  assertLedger(ledger);
  const state = proofState(ledger.aggregate.state);
  const repository = clean(ledger.repository);
  const commitSha = clean(ledger.commitSha).toLowerCase();
  const branch = clean(ledger.branch);
  const counts = ledger.aggregate.counts;
  const receiptId = clean(options.receiptId) || randomUUID();
  if (!RECEIPT_ID.test(receiptId)) {
    throw new Error('Control Room receiptId must be a UUID v4.');
  }
  const issuedAt = canonicalTimestamp(options.issuedAt ?? ledger.generatedAt);
  const supersedes = normalizeReceiptReferences(options.supersedes, receiptId);

  return {
    schema: FEDERATED_PROOF_CONTRACT,
    receiptId: receiptId.toLowerCase(),
    project: repository,
    actor: 'sekret-bip-control-room',
    authority: {
      provider: 'github',
      scope: 'repository',
      target: repository,
      mode: 'verify',
    },
    exactTarget: {
      repository,
      ...(branch ? {branch} : {}),
      sha: commitSha,
    },
    operation: PROOF_OPERATION,
    state,
    evidence: [
      {
        type: 'control_room_test_ledger',
        name: 'Sanitized exact-head GitHub check ledger',
        state,
        ref: `artifact:control-room-test-ledger-${commitSha}`,
        sha256: ledgerSha256(ledger),
      },
      {
        type: 'github_check_aggregate',
        name: `checks total=${counts.total} passed=${counts.passed} failed=${counts.failed} queued=${counts.queued} running=${counts.running} skipped=${counts.skipped} unknown=${counts.unknown}`,
        state,
      },
    ],
    acknowledges: [],
    dependsOn: [],
    supersedes,
    nextAuthority: 'runtime-provider-mcp',
    issuedAt,
  };
}

function writeReceipt(outputPath, receipt) {
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function previousReceiptIds(env, ledger) {
  const previousPath = clean(env.CONTROL_ROOM_PREVIOUS_JUSS_PROOF_PATH);
  if (!previousPath) return [];

  const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
  const receiptId = clean(previous?.receiptId).toLowerCase();
  if (!RECEIPT_ID.test(receiptId)) {
    throw new Error('Previous Control Room proof has an invalid receiptId.');
  }
  if (previous?.schema !== FEDERATED_PROOF_CONTRACT) {
    throw new Error('Previous Control Room proof uses an unsupported schema.');
  }

  const currentProject = clean(ledger.repository);
  const previousProject = clean(previous?.project);
  const previousRepository = clean(previous?.exactTarget?.repository);
  if (previousProject !== currentProject || previousRepository !== currentProject) {
    throw new Error('Previous Control Room proof belongs to a different project.');
  }

  const authority = previous?.authority;
  if (
    authority?.provider !== 'github'
    || authority?.scope !== 'repository'
    || clean(authority?.target) !== currentProject
    || authority?.mode !== 'verify'
  ) {
    throw new Error('Previous Control Room proof has an incompatible authority.');
  }
  if (previous?.operation !== PROOF_OPERATION) {
    throw new Error('Previous Control Room proof has an incompatible operation.');
  }

  const previousIssuedAt = canonicalTimestamp(previous?.issuedAt);
  const currentIssuedAt = canonicalTimestamp(ledger.generatedAt);
  if (new Date(previousIssuedAt).getTime() >= new Date(currentIssuedAt).getTime()) {
    throw new Error('Previous Control Room proof must be older than the current ledger observation.');
  }

  return [receiptId];
}

export function emitJussProofFromTestLedger(env = process.env) {
  const inputPath = clean(env.CONTROL_ROOM_TEST_LEDGER_PATH) || 'artifacts/control-room-test-ledger.json';
  const outputPath = clean(env.CONTROL_ROOM_JUSS_PROOF_PATH) || 'artifacts/control-room-juss-proof.json';
  const ledger = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const receipt = createJussProofFromTestLedger(ledger, {
    supersedes: previousReceiptIds(env, ledger),
  });
  writeReceipt(outputPath, receipt);
  console.log(JSON.stringify(receipt, null, 2));
  return receipt;
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    emitJussProofFromTestLedger();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  }
}
