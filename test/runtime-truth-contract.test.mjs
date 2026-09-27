import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const consentService = read('services/consentService.ts');
const accountDelete = read('supabase/functions/account-delete/index.ts');
const runtimeHealth = read('supabase/functions/runtime-contract-health/index.ts');
const migrationPath = 'supabase/migrations/20260715060000_harden_consent_and_deletion_runtime_truth.sql';
const markerMigrationPath = 'supabase/migrations/20260715063000_register_runtime_contract_version.sql';
const schemaWitnessMigrationPath = 'supabase/migrations/20260927185000_production_schema_witness.sql';
const migration = read(migrationPath);
const markerMigration = read(markerMigrationPath);
const schemaWitnessMigration = read(schemaWitnessMigrationPath);
const runtimeSchemaVerifier = read('scripts/verify-supabase-runtime-contract-health.mjs');
const packageJson = JSON.parse(read('package.json'));
const qualityGate = read('.github/workflows/quality-gate.yml');
const deploymentGate = read('.github/workflows/deploy-cloudflare.yml');

test('runtime migrations use Supabase-compatible timestamp prefixes', () => {
  assert.match(path.basename(migrationPath), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.match(path.basename(markerMigrationPath), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.match(path.basename(schemaWitnessMigrationPath), /^\d{14}_[a-z0-9_]+\.sql$/);
});

test('consent state and audit history are written by one authenticated RPC', () => {
  assert.match(consentService, /\.rpc\('record_user_consent'/);
  assert.doesNotMatch(consentService, /\.from\('consent_audit_log'\)\s*\.insert/);
  assert.match(consentService, /if \(error\) \{\s*throw new Error\(`consent_persistence_failed:/s);
  assert.match(consentService, /const record = await persistConsent\([\s\S]*?cache\.set\(category, record\)/);

  assert.match(migration, /create or replace function public\.record_user_consent/);
  assert.match(migration, /returns jsonb/);
  assert.match(migration, /insert into public\.user_consents/);
  assert.match(migration, /insert into public\.consent_audit_log/);
  assert.match(migration, /security definer/);
  assert.match(migration, /revoke all on function public\.record_user_consent\(text, boolean, text\) from anon/);
  assert.match(migration, /grant execute on function public\.record_user_consent\(text, boolean, text\) to authenticated/);
});

test('account deletion discovers the live private bucket inventory', () => {
  assert.match(accountDelete, /admin\.storage\.listBuckets\(\)/);
  assert.match(accountDelete, /bucket\.public !== true/);
  assert.doesNotMatch(accountDelete, /const PRIVATE_BUCKETS/);
  assert.doesNotMatch(accountDelete, /\['avatar-uploads', 'journal-images', 'voice-notes'\]/);
});

test('account deletion leaves a durable service-role receipt', () => {
  assert.match(migration, /create table if not exists public\.account_deletion_receipts/);
  assert.match(accountDelete, /\.from\('account_deletion_receipts'\)/);
  assert.match(accountDelete, /status: 'processing'/);
  assert.match(accountDelete, /status: 'completed'/);
  assert.match(accountDelete, /await sha256\(userId\)/);
});

test('production schema witness is bounded, dynamic, and service-role only', () => {
  assert.match(schemaWitnessMigration, /create or replace function public\.sekret_production_schema_witness\(\)/);
  assert.match(schemaWitnessMigration, /supabase_migrations\.schema_migrations/);
  assert.match(schemaWitnessMigration, /extensions\.digest/);
  assert.match(schemaWitnessMigration, /pg_catalog\.pg_extension/);
  assert.match(schemaWitnessMigration, /security definer/);
  assert.match(schemaWitnessMigration, /set search_path = ''/);
  assert.match(schemaWitnessMigration, /revoke all on function public\.sekret_production_schema_witness\(\) from anon/);
  assert.match(schemaWitnessMigration, /revoke all on function public\.sekret_production_schema_witness\(\) from authenticated/);
  assert.match(schemaWitnessMigration, /grant execute on function public\.sekret_production_schema_witness\(\) to service_role/);
  assert.doesNotMatch(schemaWitnessMigration, /grant execute[\s\S]*to anon/);
});

test('production deploy verification checks live Supabase runtime and schema fingerprints', () => {
  assert.match(markerMigration, /create table if not exists public\.runtime_contract_versions/);
  assert.match(markerMigration, /consent_deletion_runtime_truth/);
  assert.match(markerMigration, /20260715060000/);
  assert.match(runtimeHealth, /runtime_contract_versions/);
  assert.match(runtimeHealth, /\.rpc\('sekret_production_schema_witness'\)/);
  assert.match(runtimeHealth, /contractVersion: '20260927185000'/);
  assert.match(runtimeHealth, /expectedHistorySha256: 'f187b6741a15c51970f68ff0b6aa7de02407ada8d72af4330eeb7d210429b3a3'/);
  assert.match(runtimeHealth, /healthy = missing\.length === 0 && schemaVerified/);
  assert.match(runtimeSchemaVerifier, /SUPABASE_RUNTIME_SCHEMA_WITNESS_DRIFT/);
  assert.match(runtimeSchemaVerifier, /expectedHistorySha256/);
  assert.match(deploymentGate, /SUPABASE_RUNTIME_HEALTH_URL:/);
  assert.match(deploymentGate, /runtime-contract-health/);
  assert.match(deploymentGate, /Verify exact Supabase runtime and schema contracts/);
  assert.match(deploymentGate, /verify-supabase-runtime-contract-health\.mjs/);
  assert.doesNotMatch(deploymentGate, /SUPABASE_DB_PASSWORD/);
});

test('local and hosted gates both run runtime truth contracts', () => {
  assert.match(packageJson.scripts['verify:prepush'], /npm test/);
  assert.match(qualityGate, /runtime-truth-contracts:/);
  assert.match(qualityGate, /node --test test\/runtime-truth-contract\.test\.mjs/);
});
