import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = /^\d{14}$/;
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const MIGRATIONS_ROOT = path.join(ROOT, 'supabase', 'migrations');

export const PRODUCTION_PROJECT_REF = 'tbsevonvegdnlyjgplmm';

export const PRODUCTION_HISTORY_RECONCILIATION_PLAN = Object.freeze([
  Object.freeze({
    liveVersion: '20260723203050',
    liveName: '20260718035000_deny_blocked_crew_access',
    canonicalVersion: '20260718035000',
    canonicalName: 'deny_blocked_crew_access',
    evidenceMode: 'live-schema-and-ledger',
  }),
  Object.freeze({
    liveVersion: '20260723203116',
    liveName: '20260718035500_harden_bridge_source_idempotency',
    canonicalVersion: '20260718035500',
    canonicalName: 'harden_bridge_source_idempotency',
    evidenceMode: 'live-schema-and-ledger',
  }),
  Object.freeze({
    liveVersion: '20260820214601',
    liveName: 'drop_deprecated_pgjwt',
    canonicalVersion: '20260820211200',
    canonicalName: 'drop_deprecated_pgjwt',
    evidenceMode: 'exact-execution-receipt-plus-later-founder-retain',
  }),
  Object.freeze({
    liveVersion: '20260821073219',
    liveName: 'harden_anonymous_permanent_account_boundaries',
    canonicalVersion: '20260821071500',
    canonicalName: 'harden_anonymous_permanent_account_boundaries',
    evidenceMode: 'live-schema-and-ledger',
  }),
  Object.freeze({
    liveVersion: '20260826065736',
    liveName: '20260824223800_restore_circle_authenticated_policy_roles',
    canonicalVersion: '20260824223800',
    canonicalName: 'restore_circle_authenticated_policy_roles',
    evidenceMode: 'live-schema-and-ledger',
  }),
]);

export const PRODUCTION_SECURITY_APPLY_RECEIPTS = Object.freeze([
  Object.freeze({
    canonicalVersion: '20260826012500',
    canonicalName: 'pseudonymize_open_bip_author_ids',
    liveVersion: '20260905233953',
  }),
  Object.freeze({
    canonicalVersion: '20260827060000',
    canonicalName: 'harden_consent_permanent_account_boundary',
    liveVersion: '20260905234133',
  }),
  Object.freeze({
    canonicalVersion: '20260827061000',
    canonicalName: 'harden_economy_task_rpcs_permanent_accounts',
    liveVersion: '20260905234009',
  }),
  Object.freeze({
    canonicalVersion: '20260827062000',
    canonicalName: 'harden_legacy_circle_permanent_account_boundaries',
    liveVersion: '20260905234019',
  }),
  Object.freeze({
    canonicalVersion: '20260827063000',
    canonicalName: 'reconcile_reward_approval_live_and_replay',
    liveVersion: '20260905234039',
  }),
  Object.freeze({
    canonicalVersion: '20260831233000',
    canonicalName: 'private_self_task_visibility',
    liveVersion: '20260905234048',
  }),
]);

export const PENDING_SECURITY_MIGRATIONS = Object.freeze([]);

function canonicalFilename(pair) {
  return `${pair.canonicalVersion}_${pair.canonicalName}.sql`;
}

function validateSecurityApplyReceipts(receipts = PRODUCTION_SECURITY_APPLY_RECEIPTS) {
  const expected = new Map(
    PRODUCTION_SECURITY_APPLY_RECEIPTS.map((receipt) => [
      `${receipt.canonicalVersion}:${receipt.liveVersion}`,
      receipt,
    ]),
  );
  const seenCanonical = new Set();
  const seenLive = new Set();

  if (!Array.isArray(receipts) || receipts.length !== PRODUCTION_SECURITY_APPLY_RECEIPTS.length) {
    throw new Error(`Supabase production security apply receipt set must contain exactly ${PRODUCTION_SECURITY_APPLY_RECEIPTS.length} receipts.`);
  }

  for (const receipt of receipts) {
    if (!VERSION.test(receipt?.canonicalVersion ?? '') || !VERSION.test(receipt?.liveVersion ?? '')) {
      throw new Error('Every security apply receipt version must be exactly 14 digits.');
    }
    if (!receipt.canonicalName) {
      throw new Error('Every security apply receipt requires the canonical migration name.');
    }
    if (seenCanonical.has(receipt.canonicalVersion) || seenLive.has(receipt.liveVersion)) {
      throw new Error('Security apply receipts must be one-to-one.');
    }
    seenCanonical.add(receipt.canonicalVersion);
    seenLive.add(receipt.liveVersion);

    const pinned = expected.get(`${receipt.canonicalVersion}:${receipt.liveVersion}`);
    if (!pinned || pinned.canonicalName !== receipt.canonicalName) {
      throw new Error(`Unrecognized Supabase security apply receipt: ${receipt.canonicalVersion}:${receipt.liveVersion}.`);
    }

    const canonicalPath = path.join(MIGRATIONS_ROOT, canonicalFilename(receipt));
    if (!fs.existsSync(canonicalPath)) {
      throw new Error(`Applied production security migration is missing from repository truth: ${canonicalFilename(receipt)}.`);
    }
  }

  return receipts.map((receipt) => ({ ...receipt, canonicalFilename: canonicalFilename(receipt) }));
}

export function validateReconciliationPlan(plan = PRODUCTION_HISTORY_RECONCILIATION_PLAN) {
  if (!Array.isArray(plan) || plan.length !== PRODUCTION_HISTORY_RECONCILIATION_PLAN.length) {
    throw new Error(`Supabase production history reconciliation must contain exactly ${PRODUCTION_HISTORY_RECONCILIATION_PLAN.length} pairs.`);
  }

  const allowed = new Map(
    PRODUCTION_HISTORY_RECONCILIATION_PLAN.map((pair) => [
      `${pair.liveVersion}:${pair.canonicalVersion}`,
      pair,
    ]),
  );
  const seenLive = new Set();
  const seenCanonical = new Set();

  for (const pair of plan) {
    if (!VERSION.test(pair?.liveVersion ?? '') || !VERSION.test(pair?.canonicalVersion ?? '')) {
      throw new Error('Every reconciliation version must be exactly 14 digits.');
    }
    if (!pair.liveName || !pair.canonicalName) {
      throw new Error('Every reconciliation pair requires exact live and canonical names.');
    }
    if (pair.liveVersion === pair.canonicalVersion) {
      throw new Error('A reconciliation pair must map distinct live and canonical versions.');
    }
    if (seenLive.has(pair.liveVersion) || seenCanonical.has(pair.canonicalVersion)) {
      throw new Error('Reconciliation versions must be one-to-one.');
    }
    seenLive.add(pair.liveVersion);
    seenCanonical.add(pair.canonicalVersion);

    const expected = allowed.get(`${pair.liveVersion}:${pair.canonicalVersion}`);
    if (!expected
      || expected.liveName !== pair.liveName
      || expected.canonicalName !== pair.canonicalName
      || expected.evidenceMode !== pair.evidenceMode) {
      throw new Error(`Unrecognized Supabase history reconciliation pair: ${pair.liveVersion}:${pair.canonicalVersion}.`);
    }

    const canonicalPath = path.join(MIGRATIONS_ROOT, canonicalFilename(pair));
    if (!fs.existsSync(canonicalPath)) {
      throw new Error(`Canonical migration is missing: ${canonicalFilename(pair)}.`);
    }
  }

  const recordedSecurityApplyReceipts = validateSecurityApplyReceipts();

  return {
    schemaVersion: 2,
    projectRef: PRODUCTION_PROJECT_REF,
    pairCount: plan.length,
    pairs: plan.map((pair) => ({ ...pair, canonicalFilename: canonicalFilename(pair) })),
    recordedSecurityApplyReceipts,
    pendingSecurityMigrations: [...PENDING_SECURITY_MIGRATIONS],
    securityApplyObservedComplete: PENDING_SECURITY_MIGRATIONS.length === 0,
    mutatesProduction: false,
    historyMutationAuthorized: false,
    securityApplyAuthorized: false,
    requiresFounderApprovalBeforeHistoryMutation: true,
    requiresFounderApprovalBeforePendingSecurityApply: PENDING_SECURITY_MIGRATIONS.length > 0,
    verified: true,
  };
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliInvocation()) {
  try {
    process.stdout.write(`${JSON.stringify(validateReconciliationPlan(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
