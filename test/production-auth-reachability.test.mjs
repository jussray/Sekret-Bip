import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(
  new URL('../e2e/production-auth-reachability.spec.ts', import.meta.url),
  'utf8',
);
const localPlaywright = fs.readFileSync(
  new URL('../playwright.config.ts', import.meta.url),
  'utf8',
);
const productionPlaywright = fs.readFileSync(
  new URL('../playwright.production.config.ts', import.meta.url),
  'utf8',
);

test('production probe validates the public key and reaches Auth read-only', () => {
  assert.match(source, /page\.evaluate/);
  assert.match(source, /\/auth\/v1\/settings/);
  assert.match(source, /apikey:\s*key/);
  assert.match(source, /method:\s*['"]GET['"]/);
  assert.doesNotMatch(source, /method:\s*['"]POST['"]/);
  assert.doesNotMatch(source, /Authorization:\s*`Bearer \$\{key\}`/);
  assert.doesNotMatch(source, /\.auth\.signUp\s*\(/);

  const publicConfigBlock = source.match(
    /const productionEnv = readProductionEnv\(\);[\s\S]*?type BrowserProbe =/,
  );
  assert.ok(publicConfigBlock, 'Expected the production public-config block.');
  assert.doesNotMatch(
    publicConfigBlock[0],
    /sb_secret_|service[_-]?role|SUPABASE_SERVICE/i,
  );
});

test('production probe uses repository-controlled public config', () => {
  assert.match(source, /\.env\.production/);
  assert.match(source, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(source, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test('production probe is excluded from the blank local suite only', () => {
  assert.match(localPlaywright, /production-auth-reachability\.spec\.ts/);
  assert.match(localPlaywright, /EXPO_PUBLIC_SUPABASE_URL:\s*''/);
  assert.match(productionPlaywright, /testDir:\s*['"]\.\/e2e['"]/);
  assert.match(productionPlaywright, /production-auth-reachability\.spec\.ts/);
});
