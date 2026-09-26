import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_HISTORY_RUNTIME_ALIASES,
  evaluateMigrationHistory,
} from '../scripts/verify-supabase-production-schema.mjs';

const receipts = [
  ['20260826012500', '20260905233953', 'pseudonymize_open_bip_author_ids'],
  ['20260827060000', '20260905234133', 'harden_consent_permanent_account_boundary'],
  ['20260827061000', '20260905234009', 'harden_economy_task_rpcs_permanent_accounts'],
  ['20260827062000', '20260905234019', 'harden_legacy_circle_permanent_account_boundaries'],
  ['20260827063000', '20260905234039', 'reconcile_reward_approval_live_and_replay'],
  ['20260831233000', '20260905234048', 'private_self_task_visibility'],
];

test('current production apply receipts remain explicit exact runtime aliases', () => {
  for (const [canonicalVersion, liveVersion] of receipts) {
    assert.equal(PRODUCTION_HISTORY_RUNTIME_ALIASES[canonicalVersion], liveVersion);
  }
});

test('current production apply receipts represent the matching canonical migrations', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: receipts.at(-1)[1],
      migration_history: receipts.map(([, liveVersion, name]) => ({ version: liveVersion, name })),
    },
    receipts.map(([version, , name]) => ({ version, name })),
    '20260826012500',
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, []);
});

test('current production apply aliases fail closed on a mismatched receipt name', () => {
  const [[canonicalVersion, liveVersion, name]] = receipts;
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: liveVersion,
      migration_history: [{ version: liveVersion, name: `${name}_wrong` }],
    },
    [{ version: canonicalVersion, name }],
    canonicalVersion,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [canonicalVersion]);
});
