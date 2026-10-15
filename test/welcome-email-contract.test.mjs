import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const signup = fs.readFileSync('app/(auth)/signup.tsx', 'utf8');
const bootstrap = fs.readFileSync('src/services/auth/postAuthBootstrap.ts', 'utf8');
const client = fs.readFileSync('src/services/auth/welcomeEmail.ts', 'utf8');
const edge = fs.readFileSync('supabase/functions/send-welcome-email/index.ts', 'utf8');
const authEmailEdge = fs.readFileSync('supabase/functions/send-auth-email/index.ts', 'utf8');

const liveWorkflow = fs.readFileSync('.github/workflows/live-signup-proof.yml', 'utf8');
const publicGuideGate = fs.readFileSync('scripts/verify-welcome-guide-links.mjs', 'utf8');

test('welcome provider has a bounded network deadline and fails safely on transport error', () => {
  assert.match(edge, /signal:\s*AbortSignal\.timeout\(2_500\)/);
  assert.match(edge, /provider_unavailable/);
  assert.match(edge, /catch\s*\{/);
});

test('live onboarding release refuses unresolved public documentation before signup writes', () => {
  assert.match(publicGuideGate, /https:\/\/welcome\.sekretbip\.net/);
  assert.match(publicGuideGate, /what-is-sekret-bip/);
  assert.match(publicGuideGate, /how-it-works/);
  assert.match(publicGuideGate, /privacy-and-safety/);
  assert.match(publicGuideGate, /WELCOME_GUIDE_RELEASE_BLOCKED/);
  assert.match(liveWorkflow, /scripts\/verify-welcome-guide-links\.mjs/);
  const checks = liveWorkflow.indexOf('Verify public onboarding guide links before live signup');
  const writes = liveWorkflow.indexOf('Prepare disposable guest identity and mailbox');
  assert.ok(checks >= 0 && writes > checks);
});

test('new signups are explicitly marked eligible for welcome email v1', () => {
  assert.match(signup, /welcome_email_version:\s*1/);
  assert.match(signup, /options:\s*\{\s*emailRedirectTo:\s*redirectTo,\s*data:\s*metadata\s*\}/);
  assert.match(signup, /auth\.updateUser\([\s\S]*data:\s*metadata/);
});

test('ambiguous signup never claims success without durable auth evidence', () => {
  assert.match(signup, /SIGNUP_RECOVERY_PROBE_ATTEMPTS = 7/);
  assert.match(signup, /proveDurableSignupOutcome/);
  assert.match(signup, /email confirmation is still pending/);
  assert.match(signup, /could not verify that your account was created/);
  assert.match(signup, /could not verify that your account was saved/);
  assert.match(signup, /if \(signUpData\.session\)[\s\S]*proveDurableSignupOutcome\(sb, e, p, SIGNUP_RECOVERY_PROBE_ATTEMPTS\)/);
  assert.doesNotMatch(signup, /The account server received your signup request, but confirmation is delayed/);
});

test('post-auth bootstrap invokes welcome delivery only after founder routing is excluded', () => {
  assert.match(bootstrap, /ensureWelcomeEmail/);
  const founderIndex = bootstrap.indexOf('if (isFounderProfile(founderProfile))');
  const welcomeIndex = bootstrap.indexOf('await ensureWelcomeEmail()');
  assert.ok(founderIndex >= 0);
  assert.ok(welcomeIndex > founderIndex);
});

test('client never supplies recipient identity or personalization fields', () => {
  assert.match(client, /functions\.invoke\('send-welcome-email',\s*\{\s*body:\s*\{\},?\s*\}\)/);
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

test('welcome delivery cannot indefinitely block onboarding', () => {
  assert.match(client, /WELCOME_EMAIL_TIMEOUT_MS = 4_000/);
  assert.match(client, /Promise\.race\(\[invocation, timeout\]\)/);
});

test('auth transactional email hook verifies Supabase webhook signatures before using Resend', () => {
  assert.match(authEmailEdge, /standardwebhooks@1\.0\.0/);
  assert.match(authEmailEdge, /SEND_EMAIL_HOOK_SECRET/);
  assert.match(authEmailEdge, /new Webhook\(rawSecret\)/);
  assert.match(authEmailEdge, /webhook\.verify\(payload, headers\)/);
  assert.match(authEmailEdge, /RESEND_API_KEY/);
  assert.match(authEmailEdge, /https:\/\/api\.resend\.com\/emails/);
  assert.match(authEmailEdge, /invalid_webhook_signature/);
});

test('auth transactional email stays separate from personalized welcome delivery', () => {
  assert.match(authEmailEdge, /case "signup":[\s\S]*Confirm your Se'kret Bip account/);
  assert.match(authEmailEdge, /case "recovery":[\s\S]*Reset your Se'kret Bip password/);
  assert.match(authEmailEdge, /Idempotency-Key/);
  assert.doesNotMatch(authEmailEdge, /private_display_name/);
  assert.doesNotMatch(authEmailEdge, /welcome_email_version/);
  assert.doesNotMatch(authEmailEdge, /Se'kret Bip is not a diagnosis/);
});
