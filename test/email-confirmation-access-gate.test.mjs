import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bootstrap = read('src/services/auth/postAuthBootstrap.ts');
const context = read('src/context/VerificationContext.tsx');
const signup = read('app/(auth)/signup.tsx');
const login = read('app/(auth)/login.tsx');

test('post-auth routing requires authoritative Supabase email confirmation first', () => {
  const sessionCheck = bootstrap.indexOf('const user = data.session?.user');
  const serverRead = bootstrap.indexOf('await supabase.auth.getUser()');
  const emailGate = bootstrap.indexOf('if (!authoritativeAuth.user.email_confirmed_at)');
  const founder = bootstrap.indexOf('await getCurrentFounderProfileForRouting()');
  const welcome = bootstrap.indexOf('void ensureWelcomeEmail()');
  assert.ok(sessionCheck >= 0 && serverRead > sessionCheck);
  assert.ok(emailGate > serverRead && founder > emailGate && welcome > emailGate);
  assert.match(bootstrap, /authoritativeAuth\.user\.id !== user\.id/);
  assert.match(bootstrap, /Confirm your email before signing in/);
});

test('restored and auth-event sessions remain locked until email confirmation', () => {
  const gates = context.match(/const permanentSession = Boolean\(session && !session\.user\.is_anonymous && session\.user\.email_confirmed_at\);/g) ?? [];
  assert.equal(gates.length, 3, 'initial read, error fallback and auth event must share the guard');
  const guardedSessionWrites = context.match(/setSession\(permanentSession \? session : null\)/g) ?? [];
  assert.equal(guardedSessionWrites.length, 4, 'unconfirmed sessions must not be exposed as authenticated context');
});

test('signup and login cannot navigate past canonical guarded bootstrap', () => {
  assert.match(signup, /const bootstrap = await fetchPostAuthBootstrap\(preferredSide\);[\s\S]*?router\.replace\(bootstrap\.nextRoute/);
  assert.match(login, /const bootstrap = await fetchPostAuthBootstrap\(preferredSide\);[\s\S]*?router\.replace\(bootstrap\.nextRoute/);
});
