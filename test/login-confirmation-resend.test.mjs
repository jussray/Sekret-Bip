import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createConfirmationResend } from '../src/features/auth/confirmationResend.mjs';

test('resend validates email, serializes requests and applies cooldown even on failure', async () => {
  let now = 1000;
  let calls = 0;
  const gate = createConfirmationResend(() => now);
  const send = async (email) => { calls++; assert.equal(email, 'teen@example.invalid'); return { error: null }; };
  assert.equal(await gate.request('invalid', send), 'invalid');
  assert.equal(calls, 0);
  assert.equal(await gate.request(' teen@example.invalid ', send), 'accepted');
  assert.equal(await gate.request('teen@example.invalid', send), 'throttled');
  assert.equal(calls, 1);
  now += 60_000;
  assert.equal(await gate.request('teen@example.invalid', async () => ({ error: new Error('provider error') })), 'failed');
  assert.equal(await gate.request('teen@example.invalid', send), 'throttled');
  now += 60_000;
  assert.equal(await gate.request('teen@example.invalid', async () => { throw Error('transport'); }), 'failed');
  assert.equal(gate.remainingMs(), 60_000);
});

test('a pending resend cannot be duplicated even after cooldown has elapsed', async () => {
  let now = 1000;
  let finish;
  const gate = createConfirmationResend(() => now);
  const pending = gate.request('teen@example.invalid', () => new Promise(resolve => { finish = resolve; }));
  now += 120_000;
  assert.equal(await gate.request('teen@example.invalid', async () => ({ error: null })), 'throttled');
  finish({ error: null });
  assert.equal(await pending, 'accepted');
});

test('login exposes recovery without weakening authoritative email confirmation', () => {
  const login = readFileSync(new URL('../app/(auth)/login.tsx', import.meta.url), 'utf8');
  const bootstrap = readFileSync(new URL('../src/services/auth/postAuthBootstrap.ts', import.meta.url), 'utf8');
  assert.match(login, /accessibilityLabel="Resend confirmation email"/);
  assert.match(login, /sb\.auth\.resend\(\{/);
  assert.match(login, /type: 'signup'/);
  assert.match(login, /buildEmailConfirmationRedirectUrl\(preferredSide \?\? 'teen'\)/);
  assert.match(login, /await fetchPostAuthBootstrap\(preferredSide\)/);
  assert.match(bootstrap, /if \(!authoritativeAuth\.user\.email_confirmed_at\)/);
  const resend = login.slice(login.indexOf('async function handleResendConfirmation'), login.indexOf('async function handleSignIn'));
  assert.doesNotMatch(resend, /router\.|signUp\(|setSession\(/);
  assert.match(resend, /Request accepted\. If your account still needs confirmation/);
});
