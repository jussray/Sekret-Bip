import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync(new URL('../app/(auth)/parent-link-verify.tsx', import.meta.url), 'utf8');
const context = fs.readFileSync(new URL('../src/context/VerificationContext.tsx', import.meta.url), 'utf8');

test('VerificationContext subscribes to only the signed-in users verification row', () => {
  assert.match(context, /table: 'account_verification'/);
  assert.match(context, /event: '\*'/);
  assert.match(context, /filter: `user_id=eq\.\$\{userId\}`/);
  assert.match(context, /void refreshVerification\(\)/);
  assert.match(context, /supabase\.removeChannel\(channel\)/);
});

test('the waiting screen relies on the global signal and creates no duplicate channel', () => {
  assert.doesNotMatch(screen, /postgres_changes/);
  assert.doesNotMatch(screen, /\.channel\(/);
  assert.match(screen, /await refreshVerification\(\)/);
});
