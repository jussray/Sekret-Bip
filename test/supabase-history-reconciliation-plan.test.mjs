import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  PENDING_SECURITY_MIGRATIONS,
  PRODUCTION_HISTORY_RECONCILIATION_PLAN,
  PRODUCTION_PROJECT_REF,
  PRODUCTION_SECURITY_APPLY_RECEIPTS,
  validateReconciliationPlan,
} from '../scripts/verify-supabase-history-reconciliation-plan.mjs';

const script = fs.readFileSync('scripts/verify-supabase-history-reconciliation-plan.mjs', 'utf8');

const expectedPairs = [
  ['20260723203050', '20260718035000'],
  ['20260723203116', '20260718035500'],
  ['20260820214601', '20260820211200'],
  ['20260821073219', '20260821071500'],
  ['20260826065736', '20260824223800'],
];

const expectedSecurityReceipts = [
  ['20260826012500', '20260905233953', 'pseudonymize_open_bip_author_ids'],
  ['20260827060000', '20260905234133', 'harden_consent_permanent_account_boundary'],
  ['20260827061000', '20260905234009', 'harden_economy_task_rpcs_permanent_accounts'],
  ['20260827062000', '20260905234019', 'harden_legacy_circle_permanent_account_boundaries'],
  ['20260827063000', '20260905234039', 'reconcile_reward_approval_live_and_replay'],
  ['20260831233000', '20260905234048', 'private_self_task_visibility'],
];

test('reconciliation plan is pinned to the canonical production project and exactly five pairs', () => {
  const evidence = validateReconciliationPlan();

  assert.equal(PRODUCTION_PROJECT_REF, 'tbsevonvegdnlyjgplmm');
  assert.equal(evidence.projectRef, PRODUCTION_PROJECT_REF);
  assert.equal(evidence.pairCount, 5);
  assert.deepEqual(
    evidence.pairs.map((pair) => [pair.liveVersion, pair.canonicalVersion]),
    expectedPairs,
  );
  assert.equal(evidence.verified, true);
});

test('canonical migration identities remain immutable repository files', () => {
  for (const pair of PRODUCTION_HISTORY_RECONCILIATION_PLAN) {
    const canonicalPath = `supabase/migrations/${pair.canonicalVersion}_${pair.canonicalName}.sql`;
    assert.equal(fs.existsSync(canonicalPath), true, `${canonicalPath} must remain canonical`);
  }
});

test('validator rejects a sixth pair and any altered mapping', () => {
  assert.throws(
    () => validateReconciliationPlan([
      ...PRODUCTION_HISTORY_RECONCILIATION_PLAN,
      {
        liveVersion: '20260827000000',
        liveName: 'unexpected',
        canonicalVersion: '20260827000001',
        canonicalName: 'unexpected',
        evidenceMode: 'live-schema-and-ledger',
      },
    ]),
    /exactly 5 pairs/,
  );

  const altered = PRODUCTION_HISTORY_RECONCILIATION_PLAN.map((pair) => ({ ...pair }));
  altered[0].canonicalVersion = '20260718035001';
  assert.throws(
    () => validateReconciliationPlan(altered),
    /Unrecognized Supabase history reconciliation pair/,
  );
});

test('the plan is evidence-only and carries zero mutation authority', () => {
  const evidence = validateReconciliationPlan();
  assert.equal(evidence.mutatesProduction, false);
  assert.equal(evidence.historyMutationAuthorized, false);
  assert.equal(evidence.securityApplyAuthorized, false);
  assert.equal(evidence.requiresFounderApprovalBeforeHistoryMutation, true);
  assert.equal(evidence.requiresFounderApprovalBeforePendingSecurityApply, false);

  assert.doesNotMatch(script, /supabase\s+migration\s+repair/i);
  assert.doesNotMatch(script, /supabase\s+db\s+push/i);
  assert.doesNotMatch(script, /insert\s+into\s+supabase_migrations/i);
  assert.doesNotMatch(script, /delete\s+from\s+supabase_migrations/i);
  assert.doesNotMatch(script, /update\s+supabase_migrations/i);
});

test('production security repairs are receipt-bound and no longer mislabeled pending', () => {
  const evidence = validateReconciliationPlan();

  assert.deepEqual(PENDING_SECURITY_MIGRATIONS, []);
  assert.equal(evidence.securityApplyObservedComplete, true);
  assert.deepEqual(
    PRODUCTION_SECURITY_APPLY_RECEIPTS.map((receipt) => [
      receipt.canonicalVersion,
      receipt.liveVersion,
      receipt.canonicalName,
    ]),
    expectedSecurityReceipts,
  );
  assert.deepEqual(
    evidence.recordedSecurityApplyReceipts.map((receipt) => [
      receipt.canonicalVersion,
      receipt.liveVersion,
      receipt.canonicalName,
    ]),
    expectedSecurityReceipts,
  );

  for (const receipt of evidence.recordedSecurityApplyReceipts) {
    assert.equal(fs.existsSync(`supabase/migrations/${receipt.canonicalFilename}`), true);
  }
});
