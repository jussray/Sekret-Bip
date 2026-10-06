import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const signup = fs.readFileSync('app/(auth)/signup.tsx', 'utf8');
const bootstrap = fs.readFileSync('src/services/auth/postAuthBootstrap.ts', 'utf8');
const client = fs.readFileSync('src/services/auth/welcomeEmail.ts', 'utf8');
const edge = fs.readFileSync('supabase/functions/send-welcome-email/index.ts', 'utf8');

test('new signups are explicitly marked eligible for welcome email v1', () => {
  assert.match(signup, /welcome_email_version:\s*1/);
  assert.match(signup, /options:\s*\{\s*emailRedirectTo:\s*redirectTo,\s*data:\s*metadata\s*\}/);
  assert.match(signup, /auth\.updateUser\([\s\S]*data:\s*metadata/);
});

test('post-auth bootstrap invokes welcome delivery only after founder routing is excluded', () => {
  assert.match(bootstrap, /ensureWelcomeEmail/);
  const founderIndex = bootstrap.indexOf('if (isFounderProfile(founderProfile))');
  const welcomeIndex = bootstrap.indexOf('await ensureWelcomeEmail()');
  assert.ok(founderIndex >= 0);
  assert.ok(welcomeIndex > founderIndex);
});

test('client never supplies recipient identity or personalization fields', () => {
  assert.match(client, /functions\.invoke\('send-welcome-email',\s*\{\s*body:\s*\{\}\s*\}\)/);
  assert.doesNotMatch(client, /email\s*:/);
  assert.doesNotMatch(client, /displayName\s*:/);
  assert.doesNotMatch(client, /accountSide\s*:/);
});

test('server requires confirmed permanent auth and derives recipient from authenticated user', () => {
  assert.match(edge, /authClient\.auth\.getUser\(\)/);
  assert.match(edge, /user\.is_anonymous/);
  assert.match(edge, /user\.email_confirmed_at/);
  assert.match(edge, /to:\s*user\.email/);
  assert.match(edge, /user\.user_metadata\?\.welcome_email_version/);
});

test('welcome delivery is durable and duplicate-resistant', () => {
  assert.match(edge, /user\.app_metadata\?\.welcome_email/);
  assert.match(edge, /Idempotency-Key/);
  assert.match(edge, /sekret-bip-welcome-v\$\{WELCOME_EMAIL_VERSION\}:\$\{user\.id\}/);
  assert.match(edge, /admin\.auth\.admin\.updateUserById/);
  assert.match(edge, /status:\s*"already_sent"/);
});

test('welcome email includes onboarding and public documentation links', () => {
  assert.match(edge, /what-is-sekret-bip/);
  assert.match(edge, /how-it-works/);
  assert.match(edge, /privacy-and-safety/);
  assert.match(edge, /WELCOME_PUBLIC_ORIGIN/);
  assert.match(edge, /WELCOME_APP_ORIGIN/);
  assert.match(edge, /Se'kret Bip is not a diagnosis/);
});
