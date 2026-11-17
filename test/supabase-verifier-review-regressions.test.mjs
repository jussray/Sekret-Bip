import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateMigrationHistory,
} from '../scripts/verify-supabase-production-schema.mjs';

function historyRow(history) {
  return {
    live_max_version: history
      .map((migration) => migration.version)
      .filter((version) => typeof version === 'string')
      .sort()
      .at(-1) ?? '',
    migration_history: history,
  };
}

test('malformed live migration versions fail closed instead of disappearing', () => {
  const required = [{
    version: '20260805170500',
    name: 'extend_auth_profile_sync_identity',
  }];

  for (const malformed of [
    { version: '202608051705000', name: 'bad_receipt' },
    { name: 'missing_version_receipt' },
  ]) {
    const evaluated = evaluateMigrationHistory(
      historyRow([
        { version: '20260806020640', name: 'extend_auth_profile_sync_identity' },
        malformed,
      ]),
      required,
    );

    assert.equal(evaluated.verified, false);
    assert.equal(evaluated.missingCanonicalVersions.length, 0);
    assert.equal(evaluated.unexpectedRecentVersions.length, 1);
    assert.equal(
      evaluated.unexpectedRecentVersions[0].liveVersion,
      malformed.version ?? null,
    );
  }
});

test('accepted alias rejects a mismatched embedded timestamp', () => {
  const required = [{
    version: '20260806024500',
    name: 'harden_uos_set_updated_at_search_path',
  }];

  for (const name of [
    '19990101000000_harden_uos_set_updated_at_search_path',
    '20260806024500_harden_uos_set_updated_at_search_path',
  ]) {
    const evaluated = evaluateMigrationHistory(
      historyRow([{
        version: '20260808073044',
        name,
      }]),
      required,
    );

    assert.equal(evaluated.verified, false);
    assert.deepEqual(evaluated.missingCanonicalVersions, ['20260806024500']);
    assert.deepEqual(evaluated.acceptedAliasVersions, []);
    assert.deepEqual(evaluated.unexpectedRecentVersions, [{
      liveVersion: '20260808073044',
      name,
    }]);
  }
});

test('accepted alias permits evidenced suffix-only and matching-live-prefix receipts', () => {
  const required = [{
    version: '20260806024500',
    name: 'harden_uos_set_updated_at_search_path',
  }];

  for (const name of [
    'harden_uos_set_updated_at_search_path',
    '20260808073044_harden_uos_set_updated_at_search_path',
  ]) {
    const evaluated = evaluateMigrationHistory(
      historyRow([{ version: '20260808073044', name }]),
      required,
    );

    assert.equal(evaluated.verified, true);
    assert.deepEqual(evaluated.missingCanonicalVersions, []);
    assert.deepEqual(evaluated.unexpectedRecentVersions, []);
    assert.deepEqual(evaluated.acceptedAliasVersions, [{
      canonicalVersion: '20260806024500',
      liveVersion: '20260808073044',
      name: 'harden_uos_set_updated_at_search_path',
    }]);
  }
});
