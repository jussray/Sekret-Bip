import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('safety routes remain globally accessible', async () => {
  const source = await read('src/services/routeAccess.ts');
  assert.match(source, /area === '\(safety\)'/);
  assert.match(source, /return \{ allowed: true \}/);
});

test('social routes require verified teen access', async () => {
  const source = await read('src/services/routeAccess.ts');
  assert.match(source, /area === '\(social\)'/);
  assert.match(source, /canUnlockSocial/);
  assert.match(source, /verification_required/);
});

test('manual review and suspended states redirect centrally', async () => {
  const source = await read('src/services/routeAccess.ts');
  assert.match(source, /MANUAL_REVIEW/);
  assert.match(source, /\/\(safety\)\/manual-review/);
  assert.match(source, /SUSPENDED/);
  assert.match(source, /\/\(auth\)\/suspended/);
});
