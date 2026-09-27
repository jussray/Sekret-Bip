import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCTION_MIGRATION_VERSIONS,
  PRODUCTION_PROJECT_REF,
  assertProductionMigrationCoverage,
} from '../scripts/verify-supabase-production-ledger.mjs';

test('repository covers the observed production Supabase migration ledger exactly by version', () => {
  assert.equal(PRODUCTION_PROJECT_REF, 'tbsevonvegdnlyjgplmm');
  assert.equal(PRODUCTION_MIGRATION_VERSIONS.length, 183);
  assert.equal(new Set(PRODUCTION_MIGRATION_VERSIONS).size, 183);

  const receipt = assertProductionMigrationCoverage();

  assert.equal(receipt.expectedProductionCount, 183);
  assert.deepEqual(receipt.missingProductionVersions, []);
  assert.deepEqual(receipt.duplicateLocalVersions, []);
});
