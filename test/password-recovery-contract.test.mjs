import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  PASSWORD_RECOVERY_PATH,
  buildRecoveryRedirectUrl,
  isRecoveryCredential,
  normalizeRecoveryEmail,
  parseRecoveryUrl,
  validateNewPassword,
  validateRecoveryEmail,
} from '../src/features/auth/passwordRecovery.ts';

const loginSource = fs.readFileSync('app/(auth)/login.tsx', 'utf8');
const forgotSource = fs.readFileSync('app/(auth)/forgot-password.tsx', 'utf8');
const resetSource = fs.readFileSync('app/(auth)/reset-password.tsx', 'utf8');
const supabaseSource = fs.readFileSync('src/utils/supabase.ts', 'utf8');
const playwrightSource = fs.readFileSync('playwright.config.ts', 'utf8');
const productionPlaywrightSource = fs.readFileSync('playwright.production.config.ts', 'utf8');
const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const setupDoc = fs.readFileSync('docs/PASSWORD_RECOVERY.md', 'utf8');

test('normalizes and validates recovery emails without changing account semantics', () => {
  assert.equal(normalizeRecoveryEmail('  Teen@Example.COM  '), 'teen@example.com');
  assert.equal(validateRecoveryEmail(''), 'Enter the email connected to your Bip account.');
  assert.equal(validateRecoveryEmail('not-an-email'), 'Enter a valid email address.');
  assert.equal(validateRecoveryEmail('teen@example.com'), null);
});

test('builds explicit web and native recovery redirects', () => {
  assert.equal(PASSWORD_RECOVERY_PATH, '/reset-password');
  assert.equal(
    buildRecoveryRedirectUrl({ webOrigin: 'https://sekretbip.net' }),
    'https://sekretbip.net/reset-password',
  );
  assert.equal(
    buildRecoveryRedirectUrl({ nativeUrl: 'sekret://reset-password' }),
    'sekret://reset-password',
  );
  assert.throws(() => buildRecoveryRedirectUrl({}), /web origin or native recovery URL/i);
});

test('parses implicit recovery tokens from URL fragments and query strings', () => {
  const fragment = parseRecoveryUrl(
    'https://sekretbip.net/reset-password#access_token=access-1&refresh_token=refresh-1&type=recovery',
  );
  assert.deepEqual(fragment, {
    kind: 'tokens',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    type: 'recovery',
  });
  assert.equal(isRecoveryCredential(fragment), true);

  const query = parseRecoveryUrl(
    'sekret://reset-password?access_token=access-2&refresh_token=refresh-2&type=recovery',
  );
  assert.deepEqual(query, {
    kind: 'tokens',
    accessToken: 'access-2',
    refreshToken: 'refresh-2',
    type: 'recovery',
  });
  assert.equal(isRecoveryCredential(query), true);
});

test('supports PKCE recovery codes but rejects non-recovery credentials', () => {
  const recoveryCode = parseRecoveryUrl(
    'https://sekretbip.net/reset-password?code=pkce-code&type=recovery',
  );
  assert.deepEqual(recoveryCode, {
    kind: 'code',
    code: 'pkce-code',
    type: 'recovery',
  });
  assert.equal(isRecoveryCredential(recoveryCode), true);

  const ordinarySession = parseRecoveryUrl(
    'https://sekretbip.net/reset-password#access_token=access&refresh_token=refresh&type=signup',
  );
  assert.equal(ordinarySession.kind, 'tokens');
  assert.equal(isRecoveryCredential(ordinarySession), false);
});

test('fails closed for missing, expired, and malformed recovery links', () => {
  assert.deepEqual(parseRecoveryUrl(null), { kind: 'missing' });
  assert.deepEqual(parseRecoveryUrl('https://sekretbip.net/reset-password'), { kind: 'missing' });

  const expired = parseRecoveryUrl(
    'https://sekretbip.net/reset-password?error=access_denied&error_description=Link%20expired',
  );
  assert.deepEqual(expired, {
    kind: 'error',
    message: 'This reset link is invalid or expired. Request a new one.',
  });

  const malformed = parseRecoveryUrl('http://[');
  assert.deepEqual(malformed, {
    kind: 'error',
    message: 'This reset link is malformed. Request a new one.',
  });
});

test('validates new password length and confirmation exactly', () => {
  assert.equal(validateNewPassword('short', 'short'), 'Password must be at least 8 characters.');
  assert.equal(validateNewPassword('password1', 'password2'), "Passwords don't match.");
  assert.equal(validateNewPassword(' password ', ' password '), null);
});

test('wires the public request and recovery screens without account enumeration', () => {
  assert.match(loginSource, /Forgot password\?/);
  assert.match(loginSource, /\/\(auth\)\/forgot-password/);
  assert.match(forgotSource, /resetPasswordForEmail/);
  assert.match(forgotSource, /If an account matches that email/);
  assert.doesNotMatch(forgotSource, /We sent a password-reset link to/);
  assert.doesNotMatch(forgotSource, /Request received/);
  assert.match(forgotSource, /could not confirm the reset request/i);
  assert.match(resetSource, /PASSWORD_RECOVERY/);
  assert.match(resetSource, /exchangeCodeForSession/);
  assert.match(resetSource, /window\.history\.replaceState/);
  assert.doesNotMatch(resetSource, /auth\.getSession\(\)/);
  assert.doesNotMatch(`${forgotSource}\n${resetSource}`, /console\.(log|warn|error)/);
});

test('keeps the one-time PKCE recovery exchange owned by the reset screen', () => {
  assert.match(supabaseSource, /PASSWORD_RECOVERY_PATH/);
  assert.match(supabaseSource, /shouldDetectSessionInUrl/);
  assert.match(supabaseSource, /!pathname\.endsWith\(PASSWORD_RECOVERY_PATH\)/);
  assert.match(supabaseSource, /detectSessionInUrl: shouldDetectSessionInUrl\(\)/);
  assert.match(resetSource, /exchangeCodeForSession/);
});

test('production recovery browser checks are excluded only from the blank-config suite', () => {
  assert.match(playwrightSource, /production-password-recovery\.spec\.ts/);
  assert.match(playwrightSource, /EXPO_PUBLIC_SUPABASE_URL: ''/);
  assert.match(productionPlaywrightSource, /testDir: '\.\/e2e'/);
  assert.match(productionPlaywrightSource, /production-password-recovery\.spec\.ts/);
});

test('native scheme and hosted redirect requirements remain explicit', () => {
  assert.equal(appConfig.expo.scheme, 'sekret');
  assert.match(setupDoc, /https:\/\/sekretbip\.net\/reset-password/);
  assert.match(setupDoc, /sekret:\/\/reset-password/);
  assert.match(setupDoc, /never logs? recovery tokens|never logged/i);
});
