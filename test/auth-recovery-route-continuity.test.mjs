import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/(auth)/forgot-password.tsx', import.meta.url), 'utf8');

test('password recovery preserves the existing sign-in route and handles direct entry', () => {
  assert.match(
    source,
    /function returnToSignIn\(\) \{\s*if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);\s*return;\s*\}\s*router\.replace\('\/\(auth\)\/login'\);\s*\}/,
  );
  const returnCalls = source.match(/onPress=\{returnToSignIn\}/g) ?? [];
  assert.equal(returnCalls.length, 2);
});

test('password recovery keeps neutral account-disclosure copy', () => {
  assert.match(source, /If an account matches that email/);
  assert.doesNotMatch(source, /account exists|email is registered/i);
});
