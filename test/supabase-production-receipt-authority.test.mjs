import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  excludeProductionReceiptMarkers,
  verifySupabaseProductionSchema,
} from '../scripts/verify-supabase-production-schema.mjs';

const PROJECT_REF = 'tbsevonvegdnlyjgplmm';
const CANONICAL_VERSION = '20260826012500';
const CANONICAL_NAME = 'pseudonymize_open_bip_author_ids';
const REPOSITORY_HEAD = '20260905213434';
const RECEIPT_VERSION = '20260905233953';

function response(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fixture(prefix, extraMigrations = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const migrationsDir = path.join(root, 'migrations');
  const evidencePath = path.join(root, 'supabase-production-schema.json');
  fs.mkdirSync(migrationsDir);

  const migrations = [
    [CANONICAL_VERSION, CANONICAL_NAME, '-- canonical fixture\n'],
    [REPOSITORY_HEAD, 'reconcile_consent_permanent_account_boundary', '-- latest canonical fixture\n'],
    [
      RECEIPT_VERSION,
      CANONICAL_NAME,
      `-- Production receipt marker for canonical migration ${CANONICAL_VERSION}.\n-- Already applied to the linked Supabase project; no schema changes.\n`,
    ],
    ...extraMigrations,
  ];

  for (const [version, name, contents] of migrations) {
    fs.writeFileSync(path.join(migrationsDir, `${version}_${name}.sql`), contents, 'utf8');
  }

  return { migrationsDir, evidencePath };
}

function liveHistory() {
  return [
    { version: CANONICAL_VERSION, name: CANONICAL_NAME },
    { version: REPOSITORY_HEAD, name: 'reconcile_consent_permanent_account_boundary' },
  ];
}

test('explicit production receipt aliases do not advance canonical schema authority', async () => {
  const candidates = [
    { version: CANONICAL_VERSION, name: CANONICAL_NAME },
    { version: REPOSITORY_HEAD, name: 'reconcile_consent_permanent_account_boundary' },
    { version: RECEIPT_VERSION, name: CANONICAL_NAME },
  ];

  assert.deepEqual(excludeProductionReceiptMarkers(candidates), [
    { version: CANONICAL_VERSION, name: CANONICAL_NAME },
    { version: REPOSITORY_HEAD, name: 'reconcile_consent_permanent_account_boundary' },
  ]);

  const { migrationsDir, evidencePath } = fixture('sekret-production-receipt-authority-');
  const history = liveHistory();
  const evidence = await verifySupabaseProductionSchema({
    config: {
      token: 'test-token',
      projectRef: PROJECT_REF,
      migrationsDir,
      evidencePath,
    },
    requirePgjwtState: true,
    fetchImpl: async () => response([{
      live_max_version: REPOSITORY_HEAD,
      migration_history: history,
      pgjwt_installed: true,
      pgjwt_version: '0.2.0',
    }]),
  });

  assert.equal(evidence.verified, true);
  assert.equal(evidence.status, 'verified');
  assert.equal(evidence.expectedVersion, REPOSITORY_HEAD);
  assert.equal(evidence.liveMaxVersion, REPOSITORY_HEAD);
  assert.deepEqual(evidence.missingCanonicalVersions, []);
  assert.deepEqual(evidence.unexpectedRecentVersions, []);
  assert.equal(evidence.pgjwtVersion, '0.2.0');
});

test('an unrecognized later migration remains required and fails closed', async () => {
  const unknownVersion = '20260905235959';
  const { migrationsDir, evidencePath } = fixture(
    'sekret-production-unknown-migration-',
    [[unknownVersion, 'unknown_schema_change', '-- real unknown schema change fixture\n']],
  );
  const history = liveHistory();

  await assert.rejects(
    verifySupabaseProductionSchema({
      config: {
        token: 'test-token',
        projectRef: PROJECT_REF,
        migrationsDir,
        evidencePath,
      },
      requirePgjwtState: true,
      fetchImpl: async () => response([{
        live_max_version: REPOSITORY_HEAD,
        migration_history: history,
        pgjwt_installed: true,
        pgjwt_version: '0.2.0',
      }]),
    }),
    /SUPABASE_PRODUCTION_SCHEMA_DRIFT/,
  );

  const retained = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(retained.verified, false);
  assert.equal(retained.status, 'schema-drift');
  assert.ok(retained.missingCanonicalVersions.includes(unknownVersion));
});
