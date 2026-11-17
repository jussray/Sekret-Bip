import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_HISTORY_APPLIED_ALIASES,
  evaluateMigrationHistory,
} from '../scripts/verify-supabase-production-schema.mjs';

const required = [
  { version: '20260820211200', name: 'drop_deprecated_pgjwt' },
];

function historyRow(history) {
  return {
    live_max_version: history.map((migration) => migration.version).sort().at(-1) ?? '',
    migration_history: history,
  };
}

test('pgjwt production receipt is bound to the exact canonical migration', () => {
  assert.equal(
    PRODUCTION_HISTORY_APPLIED_ALIASES['20260820211200'],
    '20260820214601',
  );

  const evaluated = evaluateMigrationHistory(
    historyRow([{ version: '20260820214601', name: 'drop_deprecated_pgjwt' }]),
    required,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, []);
});

test('pgjwt production receipt fails closed when the migration name does not match', () => {
  const evaluated = evaluateMigrationHistory(
    historyRow([{ version: '20260820214601', name: 'different_migration' }]),
    required,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, ['20260820211200']);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [
    { liveVersion: '20260820214601', name: 'different_migration' },
  ]);
});
