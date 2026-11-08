import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const spec = readFileSync(new URL('../e2e/production-auth-reachability.spec.ts', import.meta.url), 'utf8');

test('production Auth browser proof does not require a CI-local .env.production file', () => {
  assert.doesNotMatch(spec, /readFileSync|\.env\.production|readProductionEnv/);
  assert.match(spec, /await page\.goto\('\/signup\?side=teen'\)/);
});

test('production Auth proof captures actual frontend publishable configuration without creating an account', () => {
  assert.match(spec, /await page\.route\('\*\*\/auth\/v1\/\*\*'/);
  assert.match(spec, /request\.method\(\) === 'POST'/);
  assert.match(spec, /url\.pathname\.endsWith\('\/signup'\)/);
  assert.match(spec, /observedAuthRequests\.push\(/);
  assert.match(spec, /await route\.fulfill\(/);
  assert.match(spec, /await expect\.poll\(\(\) => observedAuthRequests\.length\)/);
});

test('production Auth proof tests only safe provider reads and does not print API keys', () => {
  assert.match(spec, /method: 'GET'/);
  assert.match(spec, /await read\('\/auth\/v1\/settings'/);
  assert.match(spec, /apikey: key/);
  assert.doesNotMatch(spec, /console\.(?:log|info|error)\([^\n]*\b(?:key|apikey)\b/);
  assert.doesNotMatch(spec, /sb_secret_.*[.]toBe\(true\)/);
});
