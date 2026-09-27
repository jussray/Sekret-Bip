import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_HISTORY_ALL_ACCEPTED_ALIASES,
  PRODUCTION_HISTORY_APPLIED_ALIASES,
  evaluateMigrationHistory,
} from '../scripts/verify-supabase-production-schema.mjs';

const CANONICAL_VERSION = '20260814033200';
const LIVE_VERSION = '20260814040352';
const MIGRATION_NAME = 'harden_bridge_permanent_account_policies';

test('Bridge production apply receipt is an explicit exact alias', () => {
  assert.equal(
    PRODUCTION_HISTORY_APPLIED_ALIASES[CANONICAL_VERSION],
    LIVE_VERSION,
  );
  assert.equal(
    PRODUCTION_HISTORY_ALL_ACCEPTED_ALIASES[CANONICAL_VERSION],
    LIVE_VERSION,
  );
});

test('Bridge production receipt represents only the matching canonical migration', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: LIVE_VERSION,
      migration_history: [{ version: LIVE_VERSION, name: MIGRATION_NAME }],
    },
    [{ version: CANONICAL_VERSION, name: MIGRATION_NAME }],
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.representedCanonicalVersions, [CANONICAL_VERSION]);
  assert.deepEqual(evaluated.acceptedAliasVersions, [{
    canonicalVersion: CANONICAL_VERSION,
    liveVersion: LIVE_VERSION,
    name: MIGRATION_NAME,
  }]);
  assert.deepEqual(evaluated.missingCanonicalVersions, []);
  assert.deepEqual(evaluated.unexpectedRecentVersions, []);
});

test('Bridge alias fails closed when the live receipt name does not match', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: LIVE_VERSION,
      migration_history: [{ version: LIVE_VERSION, name: 'different_migration' }],
    },
    [{ version: CANONICAL_VERSION, name: MIGRATION_NAME }],
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [CANONICAL_VERSION]);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: LIVE_VERSION,
    name: 'different_migration',
  }]);
});
