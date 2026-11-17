import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateMigrationHistory } from '../scripts/verify-supabase-production-schema.mjs';

const REQUIRED = [{
  version: '20260805170500',
  name: 'extend_auth_profile_sync_identity',
}];

const ACCEPTED_CURRENT_RECEIPT = {
  version: '20260806020640',
  name: 'extend_auth_profile_sync_identity',
};

const LEGACY_RECEIPTS = [
  { version: '0001', name: 'init' },
  { version: '0002', name: 'circle_v1' },
  { version: '0003', name: 'oracle_parentlinks_period_safety' },
  { version: '20260614', name: 'sekret_reply' },
];

function historyRow(history) {
  return {
    live_max_version: '20260806020640',
    migration_history: history,
  };
}

test('evidence-backed legacy pre-authority receipts do not become unexpected history', () => {
  const evaluated = evaluateMigrationHistory(
    historyRow([...LEGACY_RECEIPTS, ACCEPTED_CURRENT_RECEIPT]),
    REQUIRED,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, []);
});

test('unknown short receipt still fails closed', () => {
  const evaluated = evaluateMigrationHistory(
    historyRow([
      ...LEGACY_RECEIPTS,
      { version: '0004', name: 'unknown_legacy_receipt' },
      ACCEPTED_CURRENT_RECEIPT,
    ]),
    REQUIRED,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: '0004',
    name: 'unknown_legacy_receipt',
  }]);
});

test('known legacy version with the wrong name still fails closed', () => {
  const evaluated = evaluateMigrationHistory(
    historyRow([
      { version: '0001', name: 'not_init' },
      ACCEPTED_CURRENT_RECEIPT,
    ]),
    REQUIRED,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: '0001',
    name: 'not_init',
  }]);
});
