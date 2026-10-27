import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('verification context reads the server-authoritative account row', async () => {
  const source = await read('src/context/VerificationContext.tsx');
  assert.match(source, /from\('account_verification'\)/);
  assert.match(source, /verification_state,parent_link_state,verification_reason,verification_updated_at/);
  assert.match(source, /setSnapshot\(INITIAL_VERIFICATION_SNAPSHOT\)/);
  assert.match(source, /isAuthResolved/);
  assert.match(source, /isAuthenticated/);
  assert.match(source, /Verification record unavailable/);
});

test('root layout waits for auth and verification hydration before enforcing routes', async () => {
  const source = await read('app/_layout.tsx');
  assert.match(source, /VerificationProvider/);
  assert.match(source, /isAuthResolved/);
  assert.match(source, /isAuthenticated/);
  assert.match(source, /isVerificationLoading/);
  assert.match(source, /if \(!isAuthResolved \|\| isLoading \|\| isVerificationLoading\) return;/);
  assert.match(source, /if \(isSupabaseConfigured && !isAuthenticated\)/);
  assert.match(source, /decideRouteAccess/);
  assert.match(source, /SOCIAL_SEGMENTS/);
});

test('verification remains server-owned and permanent sign-out clears the in-memory snapshot', async () => {
  const source = await read('src/context/VerificationContext.tsx');
  assert.doesNotMatch(source, /AsyncStorage/);
  assert.match(source, /onAuthStateChange/);
  assert.match(source, /session && !session\.user\.is_anonymous/);
  assert.match(source, /if \(!permanentSession\)/);
  assert.match(source, /setAuthenticated\(permanentSession\)/);
  assert.match(source, /setSnapshot\(INITIAL_VERIFICATION_SNAPSHOT\)/);
});
