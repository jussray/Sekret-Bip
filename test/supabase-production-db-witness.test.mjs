import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildDatabaseWitnessQuery,
  verifySupabaseProductionDbWitness,
} from '../scripts/verify-supabase-production-db-witness.mjs';

const PROJECT_REF = 'tbsevonvegdnlyjgplmm';
const LIVE_HISTORY = [
  { version: '20260915180126', name: 'oracle_memory_integrity' },
  { version: '20260917195220', name: 'harden_parent_teen_snapshot_invoker' },
  { version: '20260919190000', name: 'auth_signup_onboarding_baseline' },
  { version: '20260919190500', name: 'parent_link_relationship_only' },
  { version: '20260919190800', name: 'teen_age_assurance_authority' },
  { version: '20260919191000', name: 'bip_jr_managed_child_profiles' },
];
const REPOSITORY_MIGRATIONS = [
  { version: '20260919190000', name: 'auth_signup_onboarding_baseline' },
  { version: '20260919190500', name: 'parent_link_relationship_only' },
  { version: '20260919190800', name: 'teen_age_assurance_authority' },
  { version: '20260919191000', name: 'bip_jr_managed_child_profiles' },
  { version: '20260925082000', name: 'oracle_memory_integrity' },
  { version: '20260925082100', name: 'harden_parent_teen_snapshot_invoker' },
];

function fixture(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    evidencePath: path.join(root, 'supabase-production-schema.json'),
  };
}

function config(evidencePath) {
  return {
    projectRef: PROJECT_REF,
    password: 'db-secret-must-not-be-retained',
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: '5432',
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    sslMode: 'require',
    migrationsDir: '/not-used-in-injected-test',
    evidencePath,
  };
}

function receipt(overrides = {}) {
  return {
    schema_version: 1,
    project_ref: PROJECT_REF,
    query_mode: 'read-only-project-database-v1',
    row: {
      live_max_version: '20260919191000',
      migration_history: LIVE_HISTORY,
      pgjwt_installed: true,
      pgjwt_version: '0.2.0',
    },
    ...overrides,
  };
}

test('database witness query is read-only and binds the exact project ref', () => {
  const query = buildDatabaseWitnessQuery(PROJECT_REF);
  assert.match(query, new RegExp(PROJECT_REF));
  assert.match(query, /supabase_migrations\.schema_migrations/);
  assert.match(query, /pg_extension/);
  assert.doesNotMatch(query, /\b(insert|update|delete|alter|drop|create|grant|revoke)\b/i);
});

test('project database witness accepts the current canonical plus runtime-alias history', async () => {
  const { evidencePath } = fixture('sekret-db-witness-green-');
  const evidence = await verifySupabaseProductionDbWitness({
    config: config(evidencePath),
    repositoryMigrations: REPOSITORY_MIGRATIONS,
    queryRunner: async () => JSON.stringify(receipt()),
  });

  assert.equal(evidence.verified, true);
  assert.equal(evidence.status, 'verified');
  assert.equal(evidence.expectedVersion, '20260925082100');
  assert.equal(evidence.liveMaxVersion, '20260919191000');
  assert.deepEqual(evidence.missingCanonicalVersions, []);
  assert.deepEqual(evidence.unexpectedRecentVersions, []);
  assert.deepEqual(
    evidence.acceptedAliasVersions.map((item) => item.canonicalVersion),
    ['20260925082000', '20260925082100'],
  );
  assert.equal(evidence.pgjwtObserved, true);
  assert.equal(evidence.pgjwtInstalled, true);
  assert.equal(evidence.pgjwtVersion, '0.2.0');

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, /db-secret-must-not-be-retained/);
  assert.match(retained, /"type": "project-database"/);
});

test('project database witness fails closed on target-ref mismatch', async () => {
  const { evidencePath } = fixture('sekret-db-witness-ref-');
  await assert.rejects(
    verifySupabaseProductionDbWitness({
      config: config(evidencePath),
      repositoryMigrations: REPOSITORY_MIGRATIONS,
      queryRunner: async () => receipt({ project_ref: 'aaaaaaaaaaaaaaaaaaaa' }),
    }),
    /SUPABASE_PROJECT_DATABASE_REF_MISMATCH/,
  );

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.verified, false);
  assert.equal(evidence.status, 'target-identity-failed');
  assert.equal(evidence.error, 'supabase_project_database_ref_mismatch');
});

test('project database witness fails closed on unknown recent production migration', async () => {
  const { evidencePath } = fixture('sekret-db-witness-drift-');
  const drifted = receipt();
  drifted.row.migration_history = [
    ...LIVE_HISTORY,
    { version: '20260926000000', name: 'unknown_direct_change' },
  ];
  drifted.row.live_max_version = '20260926000000';

  await assert.rejects(
    verifySupabaseProductionDbWitness({
      config: config(evidencePath),
      repositoryMigrations: REPOSITORY_MIGRATIONS,
      queryRunner: async () => drifted,
    }),
    /SUPABASE_PRODUCTION_SCHEMA_DRIFT/,
  );

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.verified, false);
  assert.equal(evidence.status, 'schema-drift');
  assert.deepEqual(evidence.unexpectedRecentVersions, [{
    liveVersion: '20260926000000',
    name: 'unknown_direct_change',
  }]);
});

test('project database witness requires observed pgjwt policy state', async () => {
  const { evidencePath } = fixture('sekret-db-witness-pgjwt-');
  const withoutPgjwt = receipt();
  withoutPgjwt.row.pgjwt_installed = false;
  withoutPgjwt.row.pgjwt_version = null;

  await assert.rejects(
    verifySupabaseProductionDbWitness({
      config: config(evidencePath),
      repositoryMigrations: REPOSITORY_MIGRATIONS,
      queryRunner: async () => withoutPgjwt,
    }),
    /SUPABASE_EXTENSION_POLICY_DRIFT/,
  );

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.status, 'extension-policy-drift');
  assert.equal(evidence.verified, false);
});
