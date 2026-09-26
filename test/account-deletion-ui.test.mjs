import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync(new URL('../src/services/accountDeletion.ts', import.meta.url), 'utf8');
const controls = fs.readFileSync(new URL('../src/components/settings/AccountDeletionControls.tsx', import.meta.url), 'utf8');
const teenSettings = fs.readFileSync(new URL('../app/(teen)/settings.tsx', import.meta.url), 'utf8');
const parentSettings = fs.readFileSync(new URL('../app/(parent)/settings.tsx', import.meta.url), 'utf8');
const requestFunction = fs.readFileSync(new URL('../supabase/functions/account-deletion-request/index.ts', import.meta.url), 'utf8');
const cancelFunction = fs.readFileSync(new URL('../supabase/functions/account-request-cancel/index.ts', import.meta.url), 'utf8');
const deleteFunction = fs.readFileSync(new URL('../supabase/functions/account-delete/index.ts', import.meta.url), 'utf8');
const sweepScript = fs.readFileSync(new URL('../scripts/sweep-account-deletions.mjs', import.meta.url), 'utf8');
const sweepWorkflow = fs.readFileSync(new URL('../.github/workflows/account-deletion-sweep.yml', import.meta.url), 'utf8');
const sitePublicationGate = fs.readFileSync(new URL('../docs/site/privacy-publication-gate.md', import.meta.url), 'utf8');

test('client uses deployed account deletion function names', () => {
  assert.match(service, /functions\.invoke\('account-deletion-request'/);
  assert.match(service, /functions\.invoke\('account-request-cancel'/);
});

test('request function derives user identity from authenticated session', () => {
  assert.match(requestFunction, /db\.auth\.getUser\(\)/);
  assert.match(requestFunction, /user_id: userId/);
  assert.match(requestFunction, /confirmed !== true/);
});

test('account deletion retains the seven-day grace and cancel path', () => {
  assert.match(controls, /seven-day grace period/);
  assert.match(controls, /Schedule account deletion/);
  assert.match(controls, /Cancel scheduled deletion/);
  assert.match(controls, /accessibilityLabel="Schedule account deletion"/);
  assert.doesNotMatch(controls, /accessibilityLabel="Delete account"/);
  assert.match(cancelFunction, /status: 'cancelled'/);
  assert.match(cancelFunction, /\.eq\('status', 'pending'\)/);
});

test('delayed processor discovers live private storage, leaves a receipt, and deletes auth', () => {
  assert.match(deleteFunction, /admin\.storage\.listBuckets\(\)/);
  assert.match(deleteFunction, /bucket\.public !== true/);
  assert.doesNotMatch(deleteFunction, /const PRIVATE_BUCKETS/);
  assert.match(deleteFunction, /removePrivateFiles/);
  assert.match(deleteFunction, /account_deletion_receipts/);
  assert.match(deleteFunction, /await sha256\(userId\)/);
  assert.match(deleteFunction, /admin\.auth\.admin\.deleteUser\(userId\)/);
  assert.match(deleteFunction, /grace_period_active/);
});

test('both account roles render the shared deletion controls', () => {
  assert.match(teenSettings, /<AccountDeletionControls\s*\/>/);
  assert.match(parentSettings, /<AccountDeletionControls\s*\/>/);
  assert.match(teenSettings, /Delete local device data/);
  assert.match(parentSettings, /Delete local device data/);
});

test('sweep script only processes expired, still-pending requests via the process secret', () => {
  assert.match(sweepScript, /status: 'eq\.pending'/);
  assert.match(sweepScript, /scheduled_for: `lte\.\$\{nowIso\}`/);
  assert.match(sweepScript, /x-account-deletion-secret/);
  assert.match(sweepScript, /functions\/v1\/account-delete/);
});

test('sweep workflow keeps bounded scheduled processing plus explicit production dispatch', () => {
  assert.match(sweepWorkflow, /schedule:/);
  assert.match(sweepWorkflow, /cron:/);
  assert.match(sweepWorkflow, /workflow_dispatch:\s*\{\}/);
  assert.match(sweepWorkflow, /environment:\s*production/);
  assert.match(sweepWorkflow, /node scripts\/sweep-account-deletions\.mjs/);
  assert.match(sweepWorkflow, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(sweepWorkflow, /ACCOUNT_DELETION_PROCESS_SECRET/);
});

test('public-site gate keeps legal and runtime claims evidence-bound', () => {
  assert.match(sitePublicationGate, /seven-day grace period/);
  assert.match(sitePublicationGate, /Website footer: Privacy, Terms, and Support links/);
  assert.match(sitePublicationGate, /Do not publish claims that are not backed by current evidence/);
  assert.match(sitePublicationGate, /SOC 2 certification before an audit report exists/);
  assert.match(sitePublicationGate, /zero-retention AI processing unless/);
  assert.match(sitePublicationGate, /Desktop and mobile screenshots/);
});
