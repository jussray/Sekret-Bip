import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const compatibilityFunction = fs.readFileSync(
  new URL('../supabase/functions/delete-account/index.ts', import.meta.url),
  'utf8',
);
const canonicalProcessor = fs.readFileSync(
  new URL('../supabase/functions/account-delete/index.ts', import.meta.url),
  'utf8',
);
const canonicalRequestFunction = fs.readFileSync(
  new URL('../supabase/functions/account-deletion-request/index.ts', import.meta.url),
  'utf8',
);
const deletionService = fs.readFileSync(
  new URL('../src/services/accountDeletion.ts', import.meta.url),
  'utf8',
);
const deletionScreen = fs.readFileSync(
  new URL('../screens/settings/DeleteAccountScreen.tsx', import.meta.url),
  'utf8',
);

test('legacy delete-account endpoint schedules the canonical request instead of deleting data', () => {
  assert.match(compatibilityFunction, /account_deletion_requests/);
  assert.match(compatibilityFunction, /confirmed !== true/);
  assert.match(compatibilityFunction, /\.in\('status', \['pending', 'processing'\]\)/);
  assert.match(compatibilityFunction, /insert\(\{ user_id: userId, status: 'pending' \}\)/);
  assert.match(compatibilityFunction, /compatibilityEndpoint: true/);

  assert.doesNotMatch(compatibilityFunction, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(compatibilityFunction, /auth\.admin\.deleteUser/);
  assert.doesNotMatch(compatibilityFunction, /\.delete\s*\(/);
});

test('full deletion remains owned by the established delayed processor', () => {
  assert.match(canonicalProcessor, /seven-day grace period/i);
  assert.match(canonicalProcessor, /removePrivateFiles/);
  assert.match(canonicalProcessor, /account_deletion_receipts/);
  assert.match(canonicalProcessor, /admin\.auth\.admin\.deleteUser\(userId\)/);
  assert.match(canonicalProcessor, /grace_period_active/);
});

test('canonical request flow remains authenticated, idempotent, and cancellable', () => {
  assert.match(canonicalRequestFunction, /db\.auth\.getUser\(\)/);
  assert.match(canonicalRequestFunction, /account_deletion_requests/);
  assert.match(canonicalRequestFunction, /alreadyExists: true/);
  assert.match(deletionService, /functions\.invoke\('account-deletion-request'/);
  assert.match(deletionService, /functions\.invoke\('account-request-cancel'/);
});

test('duplicate screen uses the canonical request service and truthful grace-period copy', () => {
  assert.match(deletionScreen, /requestAccountDeletion/);
  assert.match(deletionScreen, /seven-day grace period/);
  assert.match(deletionScreen, /cancel from Settings before processing begins/i);
  assert.match(deletionScreen, /Schedule account deletion/);

  assert.doesNotMatch(deletionScreen, /functions\/v1\/delete-account/);
  assert.doesNotMatch(deletionScreen, /supabase\.auth\.signOut/);
  assert.doesNotMatch(deletionScreen, /Account and all data have been permanently deleted/);
});
