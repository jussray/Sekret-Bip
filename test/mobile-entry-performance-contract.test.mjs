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

test('signed-in web account resumes into verified routing without public welcome tap', () => {
  assert.match(entry, /const hasSignedInWebSession = isAuthResolved/);
  assert.match(entry, /Boolean\(session\?\.user && !session\.user\.is_anonymous\)/);
  assert.match(
    entry,
    /if \(Platform\.OS === 'web' && hasSignedInWebSession && !splashEntered\) \{\s*setSplashEntered\(true\);/,
    'a restored permanent web session should enter the guarded route automatically',
  );
  assert.match(
    entry,
    /if \(Platform\.OS === 'web' && !splashEntered && !hasSignedInWebSession\)/,
    'the public welcome must not hide authenticated onboarding and role screens',
  );
  assert.match(entry, /await bootstrapModule\.fetchPostAuthBootstrap\(buildSide\)/);
  assert.match(entry, /routeForParentEntryState\(parentEntry\)/);
  assert.match(entry, /verificationState === 'VERIFIED_TEEN'/);
});

test('signed-in web profile bootstrap waits until the welcome has been entered', () => {
  const deferAt = entry.indexOf("if (Platform.OS === 'web' && !splashEntered)");
  const profileImportAt = entry.indexOf("import('@/features/identity/accountProfile')");
  const bootstrapImportAt = entry.indexOf("import('@/services/auth/postAuthBootstrap')");

  assert.ok(deferAt >= 0, 'missing public-front-door defer gate');
  assert.equal(profileImportAt, -1, 'entry must not hydrate private profiles before the provider-confirmed-email gate');
  assert.ok(bootstrapImportAt > deferAt, 'post-auth bootstrap must stay behind the enter gate');
  assert.match(entry, /await bootstrapModule\.fetchPostAuthBootstrap\(buildSide\)/);
  assert.doesNotMatch(entry, /import \{\s*hydrateAccountProfile/);
  assert.doesNotMatch(entry, /import \{ fetchPostAuthBootstrap \}/);
});
