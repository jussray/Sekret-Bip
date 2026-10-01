import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WORKFLOW_ROOT = '.github/workflows';
const RECEIPT_ROOT = '.github/credential-migrations';
const SECRET_NAME = /^CLOUDFLARE_[A-Z0-9_]+$/;
const SECRET_REFERENCE = /secrets\.(CLOUDFLARE_[A-Z0-9_]+)/g;
const RECEIPT_SCHEMA = 'juss/cloudflare-credential-migration@v1';

function git(rootDir, ...args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function show(rootDir, ref, relativePath) {
  try {
    return git(rootDir, 'show', `${ref}:${relativePath}`);
  } catch {
    return null;
  }
}

function listPaths(rootDir, ref, root) {
  const output = git(rootDir, 'ls-tree', '-r', '--name-only', ref, '--', root);
  return output ? output.split('\n').filter(Boolean) : [];
}

function parseNameStatus(rootDir, baseRef, headRef, root) {
  const output = git(rootDir, 'diff', '--name-status', '--find-renames', baseRef, headRef, '--', root);
  if (!output) return [];

  return output.split('\n').filter(Boolean).map((line) => {
    const columns = line.split('\t');
    const status = columns[0];
    if (status.startsWith('R') || status.startsWith('C')) {
      return { status, oldPath: columns[1], path: columns[2] };
    }
    return { status, path: columns[1] };
  });
}

function extractSecrets(content) {
  const secrets = new Set();
  if (!content) return secrets;

  for (const match of content.matchAll(SECRET_REFERENCE)) secrets.add(match[1]);
  return secrets;
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function receiptPath(secret) {
  return `${RECEIPT_ROOT}/${secret}.json`;
}

function validIsoTimestamp(value) {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function pushViolation(violations, code, detail, extra = {}) {
  violations.push({ code, detail, ...extra });
}

function validateReceipt(receipt, relativePath, violations) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    pushViolation(violations, 'credential-migration-receipt-invalid', 'Credential migration receipt must be a JSON object.', { path: relativePath });
    return false;
  }

  const allowedTopLevel = new Set([
    'schema',
    'newSecret',
    'previousSecrets',
    'phase',
    'secretStoreScope',
    'providerEvidence',
  ]);
  const unexpected = Object.keys(receipt).filter((key) => !allowedTopLevel.has(key));
  if (unexpected.length > 0) {
    pushViolation(
      violations,
      'credential-migration-receipt-unexpected-fields',
      'Credential migration receipts are strict metadata and may not carry arbitrary fields or secret values.',
      { path: relativePath, fields: unexpected.sort() },
    );
  }

  if (receipt.schema !== RECEIPT_SCHEMA) {
    pushViolation(violations, 'credential-migration-receipt-schema', `Receipt schema must be ${RECEIPT_SCHEMA}.`, { path: relativePath });
  }

  if (!SECRET_NAME.test(receipt.newSecret ?? '')) {
    pushViolation(violations, 'credential-migration-new-secret-invalid', 'newSecret must be a CLOUDFLARE_* GitHub secret name.', { path: relativePath });
  }

  const expectedPath = receipt.newSecret && SECRET_NAME.test(receipt.newSecret) ? receiptPath(receipt.newSecret) : null;
  if (expectedPath && relativePath !== expectedPath) {
    pushViolation(violations, 'credential-migration-receipt-path-mismatch', `Receipt for ${receipt.newSecret} must live at ${expectedPath}.`, { path: relativePath });
  }

  if (!Array.isArray(receipt.previousSecrets)) {
    pushViolation(violations, 'credential-migration-previous-secrets-invalid', 'previousSecrets must be an array.', { path: relativePath });
  } else {
    const unique = new Set(receipt.previousSecrets);
    if (unique.size !== receipt.previousSecrets.length) {
      pushViolation(violations, 'credential-migration-previous-secrets-duplicate', 'previousSecrets must not contain duplicates.', { path: relativePath });
    }
    for (const previousSecret of receipt.previousSecrets) {
      if (!SECRET_NAME.test(previousSecret)) {
        pushViolation(violations, 'credential-migration-previous-secret-invalid', 'Every previous secret must be a CLOUDFLARE_* GitHub secret name.', { path: relativePath, previousSecret });
      }
      if (previousSecret === receipt.newSecret) {
        pushViolation(violations, 'credential-migration-self-reference', 'newSecret cannot also be listed as a previous secret.', { path: relativePath });
      }
    }
  }

  if (!['stage', 'cutover'].includes(receipt.phase)) {
    pushViolation(violations, 'credential-migration-phase-invalid', 'phase must be stage or cutover.', { path: relativePath });
  }

  if (typeof receipt.secretStoreScope !== 'string' || receipt.secretStoreScope.trim() === '') {
    pushViolation(violations, 'credential-migration-secret-store-scope-missing', 'secretStoreScope must name the GitHub secret store/environment being observed.', { path: relativePath });
  }

  if (receipt.phase === 'stage') {
    if (receipt.providerEvidence !== null) {
      pushViolation(violations, 'credential-migration-stage-evidence-must-be-null', 'Stage receipts must not claim provider acceptance before the staged credential has been observed.', { path: relativePath });
    }
  }

  if (receipt.phase === 'cutover') {
    const evidence = receipt.providerEvidence;
    const allowedEvidenceFields = new Set(['ref', 'observedAt', 'providerAccepted', 'secretValueExposed']);
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
      pushViolation(violations, 'credential-migration-provider-evidence-missing', 'Cutover requires provider-backed evidence.', { path: relativePath });
    } else {
      const unexpectedEvidence = Object.keys(evidence).filter((key) => !allowedEvidenceFields.has(key));
      if (unexpectedEvidence.length > 0) {
        pushViolation(violations, 'credential-migration-provider-evidence-unexpected-fields', 'Provider evidence must remain sanitized and metadata-only.', { path: relativePath, fields: unexpectedEvidence.sort() });
      }
      if (typeof evidence.ref !== 'string' || !evidence.ref.startsWith('https://github.com/')) {
        pushViolation(violations, 'credential-migration-provider-evidence-ref-invalid', 'Cutover evidence must reference a retained GitHub Actions/issue/PR receipt.', { path: relativePath });
      }
      if (!validIsoTimestamp(evidence.observedAt)) {
        pushViolation(violations, 'credential-migration-provider-evidence-time-invalid', 'Cutover evidence must include an ISO-compatible observedAt timestamp.', { path: relativePath });
      }
      if (evidence.providerAccepted !== true) {
        pushViolation(violations, 'credential-migration-provider-not-accepted', 'Cutover is forbidden until the provider accepted the staged credential.', { path: relativePath });
      }
      if (evidence.secretValueExposed !== false) {
        pushViolation(violations, 'credential-migration-secret-exposure-boundary', 'Provider evidence must explicitly confirm no secret value was exposed.', { path: relativePath });
      }
    }
  }

  return !violations.some((violation) => violation.path === relativePath);
}

function loadReceipts(rootDir, ref, violations = []) {
  const receipts = new Map();
  for (const relativePath of listPaths(rootDir, ref, RECEIPT_ROOT)) {
    if (!relativePath.endsWith('.json')) continue;
    const raw = show(rootDir, ref, relativePath);
    try {
      const receipt = JSON.parse(raw ?? 'null');
      validateReceipt(receipt, relativePath, violations);
      if (receipt?.newSecret && SECRET_NAME.test(receipt.newSecret)) receipts.set(receipt.newSecret, { path: relativePath, receipt });
    } catch (error) {
      pushViolation(violations, 'credential-migration-receipt-json-invalid', `Credential migration receipt is not valid JSON: ${error.message}`, { path: relativePath });
    }
  }
  return receipts;
}

function changedReceiptPaths(rootDir, baseRef, headRef) {
  return new Set(parseNameStatus(rootDir, baseRef, headRef, RECEIPT_ROOT).map((change) => change.path));
}

export function verifyCloudflareCredentialMigrationLineage({ rootDir = process.cwd(), baseRef, headRef = 'HEAD' }) {
  if (!baseRef) throw new Error('baseRef is required');
  git(rootDir, 'cat-file', '-e', `${baseRef}^{commit}`);
  git(rootDir, 'cat-file', '-e', `${headRef}^{commit}`);

  const violations = [];
  const baseReceiptViolations = [];
  const headReceiptViolations = [];
  const baseReceipts = loadReceipts(rootDir, baseRef, baseReceiptViolations);
  const headReceipts = loadReceipts(rootDir, headRef, headReceiptViolations);
  violations.push(...headReceiptViolations);

  const changedReceipts = changedReceiptPaths(rootDir, baseRef, headRef);
  const workflowChanges = parseNameStatus(rootDir, baseRef, headRef, WORKFLOW_ROOT);
  const transitions = [];

  for (const change of workflowChanges) {
    const code = change.status[0];
    const basePath = code === 'A' ? null : (change.oldPath ?? change.path);
    const headPath = code === 'D' ? null : change.path;
    const baseSecrets = extractSecrets(basePath ? show(rootDir, baseRef, basePath) : null);
    const headSecrets = extractSecrets(headPath ? show(rootDir, headRef, headPath) : null);
    const added = difference(headSecrets, baseSecrets);
    const removed = difference(baseSecrets, headSecrets);

    if (added.length === 0 && removed.length === 0) continue;
    const workflowPath = headPath ?? basePath;
    transitions.push({ workflowPath, added, removed });

    for (const newSecret of added) {
      const headEntry = headReceipts.get(newSecret);
      const baseEntry = baseReceipts.get(newSecret);
      const baseAlreadyProven = baseEntry?.receipt?.phase === 'cutover' && baseEntry.receipt.providerEvidence?.providerAccepted === true;

      if (!headEntry) {
        pushViolation(violations, 'credential-migration-receipt-missing', `Introducing ${newSecret} requires ${receiptPath(newSecret)}.`, { workflow: workflowPath, newSecret });
        continue;
      }

      if (!baseAlreadyProven && !changedReceipts.has(headEntry.path)) {
        pushViolation(violations, 'credential-migration-receipt-not-bound-to-change', `The migration receipt for ${newSecret} must change in the same candidate that introduces the unproven credential consumer.`, { workflow: workflowPath, newSecret, path: headEntry.path });
      }

      const receipt = headEntry.receipt;
      if (receipt.phase === 'stage') {
        for (const previousSecret of receipt.previousSecrets ?? []) {
          if (!baseSecrets.has(previousSecret)) {
            pushViolation(violations, 'credential-migration-stage-previous-authority-missing', `Stage receipt names ${previousSecret}, but that credential was not an authority in the base workflow.`, { workflow: workflowPath, newSecret, previousSecret });
          }
          if (!headSecrets.has(previousSecret)) {
            pushViolation(violations, 'credential-migration-one-phase-removal', `Stage phase cannot remove ${previousSecret}; keep previous authority until the new credential is provider-proven.`, { workflow: workflowPath, newSecret, previousSecret });
          }
        }
        if ((receipt.previousSecrets ?? []).some((previousSecret) => removed.includes(previousSecret))) {
          pushViolation(violations, 'credential-migration-one-phase-removal', 'A staged credential cannot remove its previous credential in the same candidate.', { workflow: workflowPath, newSecret });
        }
      }

      if (receipt.phase === 'cutover' && !baseSecrets.has(newSecret)) {
        pushViolation(violations, 'credential-migration-cutover-not-staged-on-base', `Cutover for ${newSecret} is one-phase: the new credential consumer did not exist on the base ref. Stage and prove it first.`, { workflow: workflowPath, newSecret });
      }
    }

    for (const previousSecret of removed) {
      const candidates = [...headReceipts.values()].filter(({ receipt }) =>
        receipt?.phase === 'cutover'
        && (receipt.previousSecrets ?? []).includes(previousSecret)
        && headSecrets.has(receipt.newSecret));

      if (candidates.length !== 1) {
        pushViolation(
          violations,
          'credential-migration-cutover-receipt-missing',
          `Removing ${previousSecret} requires exactly one cutover receipt whose staged new credential remains in the workflow.`,
          { workflow: workflowPath, previousSecret, candidateCount: candidates.length },
        );
        continue;
      }

      const { path: migrationReceiptPath, receipt } = candidates[0];
      if (!changedReceipts.has(migrationReceiptPath)) {
        pushViolation(violations, 'credential-migration-cutover-receipt-not-current', `Cutover receipt ${migrationReceiptPath} must be refreshed in the same candidate that removes ${previousSecret}.`, { workflow: workflowPath, previousSecret, newSecret: receipt.newSecret });
      }
      if (!baseSecrets.has(receipt.newSecret)) {
        pushViolation(violations, 'credential-migration-cutover-not-staged-on-base', `Cutover for ${receipt.newSecret} is forbidden because the new consumer was not already present on the base ref.`, { workflow: workflowPath, previousSecret, newSecret: receipt.newSecret });
      }
      if (receipt.providerEvidence?.providerAccepted !== true) {
        pushViolation(violations, 'credential-migration-cutover-provider-proof-missing', `Cutover for ${receipt.newSecret} requires retained provider acceptance evidence.`, { workflow: workflowPath, previousSecret, newSecret: receipt.newSecret });
      }
    }
  }

  violations.sort((left, right) => `${left.workflow ?? left.path ?? ''}:${left.code}`.localeCompare(`${right.workflow ?? right.path ?? ''}:${right.code}`));

  return {
    schemaVersion: 1,
    verified: violations.length === 0,
    baseRef,
    headRef,
    workflowTransitionCount: transitions.length,
    changedReceiptCount: changedReceipts.size,
    transitions,
    violations,
    inheritedBaseReceiptViolationCount: baseReceiptViolations.length,
  };
}

function parseArgs(argv) {
  const options = { baseRef: null, headRef: 'HEAD', report: null };
  for (const arg of argv) {
    if (arg.startsWith('--base=')) options.baseRef = arg.slice('--base='.length);
    else if (arg.startsWith('--head=')) options.headRef = arg.slice('--head='.length);
    else if (arg.startsWith('--report=')) options.report = arg.slice('--report='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const { baseRef, headRef, report } = parseArgs(argv);
  const result = verifyCloudflareCredentialMigrationLineage({ baseRef, headRef });

  if (report) {
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(report, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }

  console.log(`CLOUDFLARE_CREDENTIAL_MIGRATION_LINEAGE ${result.verified ? 'VERIFIED' : 'FAILED'} transitions=${result.workflowTransitionCount} violations=${result.violations.length}`);
  if (!result.verified) {
    for (const violation of result.violations) console.error(`${violation.code}: ${violation.detail}`);
    process.exitCode = 1;
  }
  return result;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) await main();
