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
const migration = read(migrationPath);
const markerMigration = read(markerMigrationPath);
const packageJson = JSON.parse(read('package.json'));
const qualityGate = read('.github/workflows/quality-gate.yml');
const deploymentGate = read('.github/workflows/deploy-cloudflare.yml');

test('runtime migrations use Supabase-compatible timestamp prefixes', () => {
  assert.match(path.basename(migrationPath), /^\d{14}_[a-z0-9_]+\.sql$/);
  assert.match(path.basename(markerMigrationPath), /^\d{14}_[a-z0-9_]+\.sql$/);
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

test('production deploy verification checks the live Supabase contract marker', () => {
  assert.match(markerMigration, /create table if not exists public\.runtime_contract_versions/);
  assert.match(markerMigration, /consent_deletion_runtime_truth/);
  assert.match(markerMigration, /20260715060000/);
  assert.match(runtimeHealth, /runtime_contract_versions/);
  assert.match(runtimeHealth, /healthy: missing\.length === 0/);
  assert.match(deploymentGate, /SUPABASE_RUNTIME_HEALTH_URL:/);
  assert.match(deploymentGate, /runtime-contract-health/);
  assert.match(deploymentGate, /Verify Supabase runtime contracts/);
  assert.match(deploymentGate, /curl --fail-with-body/);
});

test('local and hosted gates both run runtime truth contracts', () => {
  assert.match(packageJson.scripts['verify:prepush'], /npm test/);
  assert.match(qualityGate, /runtime-truth-contracts:/);
  assert.match(qualityGate, /node --test test\/runtime-truth-contract\.test\.mjs/);
});
