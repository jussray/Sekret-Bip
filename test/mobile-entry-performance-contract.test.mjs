import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const entry = read('app/index.tsx');
const verification = read('src/context/VerificationContext.tsx');

test('entry consumes the shared resolved session instead of restoring auth again', () => {
  assert.match(entry, /isAuthResolved/);
  assert.match(entry, /session,/);
  assert.match(entry, /const user = session\?\.user/);
  assert.doesNotMatch(entry, /auth\.getSession\(/);
  assert.doesNotMatch(entry, /import \{ getSupabase/);
});

test('verification owns one explicit startup session restoration', () => {
  const getSessionCalls = verification.match(/auth\.getSession\(/g) ?? [];
  assert.equal(getSessionCalls.length, 1);
  assert.match(verification, /event === 'INITIAL_SESSION'/);
  assert.match(verification, /never performs a second startup getSession/);
});

test('signed-in web profile bootstrap waits until the welcome has been entered', () => {
  const deferAt = entry.indexOf("if (Platform.OS === 'web' && !splashEntered)");
  const profileImportAt = entry.indexOf("import('@/features/identity/accountProfile')");
  const bootstrapImportAt = entry.indexOf("import('@/services/auth/postAuthBootstrap')");

  assert.ok(deferAt >= 0, 'missing public-front-door defer gate');
  assert.ok(profileImportAt > deferAt, 'profile hydration must stay behind the enter gate');
  assert.ok(bootstrapImportAt > deferAt, 'post-auth bootstrap must stay behind the enter gate');
  assert.doesNotMatch(entry, /import \{\s*hydrateAccountProfile/);
  assert.doesNotMatch(entry, /import \{ fetchPostAuthBootstrap \}/);
});
