import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../app/(onboarding)/parent-splash.tsx', import.meta.url),
  'utf8',
);

test('deprecated parent splash route redirects immediately without rendering a splash', () => {
  assert.equal(source.includes("from '@screens/SplashScreen'"), false);
  assert.equal(source.includes('ENTRY_LOCK_MS'), false);
  assert.equal(source.includes("router.replace(destination)"), true);
  assert.equal(source.includes("'/(onboarding)/parent-welcome'"), true);
  assert.equal(source.includes('return null'), true);
});
