import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_HISTORY_ALL_ACCEPTED_ALIASES,
  PRODUCTION_HISTORY_APPLIED_ALIASES,
  PRODUCTION_HISTORY_RUNTIME_ALIASES,
  evaluateMigrationHistory,
} from '../scripts/verify-supabase-production-schema.mjs';

const ANON_CANONICAL_VERSION = '20260821071500';
const ANON_LIVE_VERSION = '20260821073219';
const ANON_MIGRATION_NAME = 'harden_anonymous_permanent_account_boundaries';
const TC01_CANONICAL_VERSION = '20260822060000';
const TC01_LIVE_VERSION = '20260824004706';
const TC01_MIGRATION_NAME = 'tc01_private_safety_boundary';
const CIRCLE_POLICY_CANONICAL_VERSION = '20260824223800';
const CIRCLE_POLICY_LIVE_VERSION = '20260826065736';
const CIRCLE_POLICY_MIGRATION_NAME = 'restore_circle_authenticated_policy_roles';
const REOPEN_CANONICAL_VERSION = '20260901000500';
const REOPEN_LIVE_VERSION = '20260901000535';
const REOPEN_MIGRATION_NAME = 'create_private_reopen_reminders';

test('anonymous-boundary production apply receipt remains an explicit exact alias', () => {
  assert.equal(PRODUCTION_HISTORY_APPLIED_ALIASES[ANON_CANONICAL_VERSION], ANON_LIVE_VERSION);
  assert.equal(PRODUCTION_HISTORY_ALL_ACCEPTED_ALIASES[ANON_CANONICAL_VERSION], ANON_LIVE_VERSION);
});

test('anonymous-boundary live receipt represents the matching canonical migration', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: ANON_LIVE_VERSION,
      migration_history: [{ version: ANON_LIVE_VERSION, name: ANON_MIGRATION_NAME }],
    },
    [{ version: ANON_CANONICAL_VERSION, name: ANON_MIGRATION_NAME }],
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.representedCanonicalVersions, [ANON_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.acceptedAliasVersions, [{
    canonicalVersion: ANON_CANONICAL_VERSION,
    liveVersion: ANON_LIVE_VERSION,
    name: ANON_MIGRATION_NAME,
  }]);
});

test('anonymous-boundary alias fails closed when the receipt name differs', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: ANON_LIVE_VERSION,
      migration_history: [{ version: ANON_LIVE_VERSION, name: 'different_migration' }],
    },
    [{ version: ANON_CANONICAL_VERSION, name: ANON_MIGRATION_NAME }],
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [ANON_CANONICAL_VERSION]);
});

test('TC-01 production apply receipt is an explicit runtime alias', () => {
  assert.equal(PRODUCTION_HISTORY_RUNTIME_ALIASES[TC01_CANONICAL_VERSION], TC01_LIVE_VERSION);
});

test('TC-01 live receipt represents only the matching canonical migration', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: TC01_LIVE_VERSION,
      migration_history: [{ version: TC01_LIVE_VERSION, name: TC01_MIGRATION_NAME }],
    },
    [{ version: TC01_CANONICAL_VERSION, name: TC01_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.representedCanonicalVersions, [TC01_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.acceptedAliasVersions, [{
    canonicalVersion: TC01_CANONICAL_VERSION,
    liveVersion: TC01_LIVE_VERSION,
    name: TC01_MIGRATION_NAME,
  }]);
});

test('TC-01 alias fails closed when the receipt name differs', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: TC01_LIVE_VERSION,
      migration_history: [{ version: TC01_LIVE_VERSION, name: 'different_migration' }],
    },
    [{ version: TC01_CANONICAL_VERSION, name: TC01_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [TC01_CANONICAL_VERSION]);
});

test('circle policy production receipt is an explicit exact runtime alias', () => {
  assert.equal(
    PRODUCTION_HISTORY_RUNTIME_ALIASES[CIRCLE_POLICY_CANONICAL_VERSION],
    CIRCLE_POLICY_LIVE_VERSION,
  );
});

test('circle policy live receipt represents only the matching canonical migration', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: CIRCLE_POLICY_LIVE_VERSION,
      migration_history: [{
        version: CIRCLE_POLICY_LIVE_VERSION,
        name: `${CIRCLE_POLICY_LIVE_VERSION}_${CIRCLE_POLICY_MIGRATION_NAME}`,
      }],
    },
    [{ version: CIRCLE_POLICY_CANONICAL_VERSION, name: CIRCLE_POLICY_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.representedCanonicalVersions, [CIRCLE_POLICY_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.acceptedAliasVersions, [{
    canonicalVersion: CIRCLE_POLICY_CANONICAL_VERSION,
    liveVersion: CIRCLE_POLICY_LIVE_VERSION,
    name: CIRCLE_POLICY_MIGRATION_NAME,
  }]);
});

test('circle policy alias fails closed when the embedded receipt name differs', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: CIRCLE_POLICY_LIVE_VERSION,
      migration_history: [{
        version: CIRCLE_POLICY_LIVE_VERSION,
        name: `${CIRCLE_POLICY_LIVE_VERSION}_different_migration`,
      }],
    },
    [{ version: CIRCLE_POLICY_CANONICAL_VERSION, name: CIRCLE_POLICY_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [CIRCLE_POLICY_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: CIRCLE_POLICY_LIVE_VERSION,
    name: `${CIRCLE_POLICY_LIVE_VERSION}_different_migration`,
  }]);
});

test('reopen-reminders production receipt is an explicit exact runtime alias', () => {
  assert.equal(
    PRODUCTION_HISTORY_RUNTIME_ALIASES[REOPEN_CANONICAL_VERSION],
    REOPEN_LIVE_VERSION,
  );
});

test('reopen-reminders live receipt represents only the matching canonical migration', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: REOPEN_LIVE_VERSION,
      migration_history: [{
        version: REOPEN_LIVE_VERSION,
        name: `${REOPEN_LIVE_VERSION}_${REOPEN_MIGRATION_NAME}`,
      }],
    },
    [{ version: REOPEN_CANONICAL_VERSION, name: REOPEN_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, true);
  assert.deepEqual(evaluated.representedCanonicalVersions, [REOPEN_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.acceptedAliasVersions, [{
    canonicalVersion: REOPEN_CANONICAL_VERSION,
    liveVersion: REOPEN_LIVE_VERSION,
    name: REOPEN_MIGRATION_NAME,
  }]);
});

test('reopen-reminders alias fails closed when the embedded timestamp contradicts the live version', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: REOPEN_LIVE_VERSION,
      migration_history: [{
        version: REOPEN_LIVE_VERSION,
        name: `${REOPEN_CANONICAL_VERSION}_${REOPEN_MIGRATION_NAME}`,
      }],
    },
    [{ version: REOPEN_CANONICAL_VERSION, name: REOPEN_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [REOPEN_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: REOPEN_LIVE_VERSION,
    name: `${REOPEN_CANONICAL_VERSION}_${REOPEN_MIGRATION_NAME}`,
  }]);
});

test('reopen-reminders alias fails closed when the receipt name differs', () => {
  const evaluated = evaluateMigrationHistory(
    {
      live_max_version: REOPEN_LIVE_VERSION,
      migration_history: [{ version: REOPEN_LIVE_VERSION, name: 'different_migration' }],
    },
    [{ version: REOPEN_CANONICAL_VERSION, name: REOPEN_MIGRATION_NAME }],
    undefined,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );

  assert.equal(evaluated.verified, false);
  assert.deepEqual(evaluated.missingCanonicalVersions, [REOPEN_CANONICAL_VERSION]);
  assert.deepEqual(evaluated.unexpectedRecentVersions, [{
    liveVersion: REOPEN_LIVE_VERSION,
    name: 'different_migration',
  }]);
});
