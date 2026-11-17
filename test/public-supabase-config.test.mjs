import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyPublicWebConfig } from '../scripts/verify-public-web-config.mjs';

const envSource = fs.readFileSync(
  new URL('../src/utils/env.ts', import.meta.url),
  'utf8',
);
const productionEnv = fs.readFileSync(
  new URL('../.env.production', import.meta.url),
  'utf8',
);
const gitignore = fs.readFileSync(
  new URL('../.gitignore', import.meta.url),
  'utf8',
);
const supabaseSource = fs.readFileSync(
  new URL('../src/utils/supabase.ts', import.meta.url),
  'utf8',
);
const frontDoorSource = fs.readFileSync(
  new URL('../app/index.tsx', import.meta.url),
  'utf8',
);
const releaseMetadataSource = fs.readFileSync(
  new URL('../scripts/write-release-metadata.mjs', import.meta.url),
  'utf8',
);

const PUBLIC_FIXTURE = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://fixture-project.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_public_key',
  EXPO_PUBLIC_BACKEND_URL: 'https://fixture-worker.workers.dev',
};

test('production Expo export receives the canonical public Supabase config', () => {
  assert.match(
    productionEnv,
    /^EXPO_PUBLIC_SUPABASE_URL=https:\/\/tbsevonvegdnlyjgplmm\.supabase\.co$/m,
  );
  assert.match(
    productionEnv,
    /^EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[A-Za-z0-9_-]+$/m,
  );
  assert.match(
    productionEnv,
    /^EXPO_PUBLIC_BACKEND_URL=https:\/\/api\.sekretbip\.net$/m,
  );
  assert.doesNotMatch(
    productionEnv,
    /^EXPO_PUBLIC_BACKEND_URL=https:\/\/sekret-backend\.mcgill-raylene\.workers\.dev$/m,
  );
  assert.doesNotMatch(gitignore, /^\.env\.production$/m);
});

test('client uses Expo-supported static dot-notation references', () => {
  assert.match(
    envSource,
    /export const SUPABASE_URL = clean\(process\.env\.EXPO_PUBLIC_SUPABASE_URL\)/,
  );
  assert.match(
    envSource,
    /clean\(process\.env\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY\)[\s\S]*clean\(process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY\)/,
  );
  assert.match(
    envSource,
    /export const BACKEND_URL = clean\(process\.env\.EXPO_PUBLIC_BACKEND_URL\)/,
  );
  assert.doesNotMatch(envSource, /clean\(env\.EXPO_PUBLIC_/);
  assert.doesNotMatch(envSource, /process\.env\[['"]EXPO_PUBLIC_/);

  const publishableIndex = envSource.indexOf(
    'clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
  );
  const legacyIndex = envSource.indexOf(
    'clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)',
  );
  assert.notEqual(publishableIndex, -1);
  assert.notEqual(legacyIndex, -1);
  assert.equal(publishableIndex < legacyIndex, true);
});

test('production config contains only public client values', () => {
  assert.doesNotMatch(productionEnv, /sb_secret_/i);
  assert.doesNotMatch(productionEnv, /SUPABASE_SERVICE_ROLE_KEY/i);
  assert.doesNotMatch(productionEnv, /OPENAI_API_KEY/i);
  assert.doesNotMatch(productionEnv, /SEKRET_CLIENT_TOKEN/i);
  assert.match(productionEnv, /Never add server secrets here/);
});

test('Supabase readiness uses the resolved Expo public values', () => {
  assert.match(envSource, /isSupabaseReady = Boolean\(SUPABASE_URL && SUPABASE_ANON\)/);
  assert.match(supabaseSource, /export const isSupabaseConfigured = isSupabaseReady/);
  assert.match(supabaseSource, /createClient\(SUPABASE_URL, SUPABASE_ANON/);
});

test('front door shares canonical Supabase readiness for production sign-in', () => {
  assert.match(
    frontDoorSource,
    /import \{ isSupabaseConfigured \} from '@\/utils\/supabase';/,
  );
  assert.match(
    frontDoorSource,
    /const isAccountServiceConfigured = isSupabaseConfigured;/,
  );
  assert.doesNotMatch(frontDoorSource, /isSupabaseConfigured\(\)/);
  assert.doesNotMatch(
    frontDoorSource,
    /EXPO_PUBLIC_SUPABASE_URL\s*&&\s*process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY/,
  );
});

test('release generation refuses a web bundle missing required public config', () => {
  assert.match(
    releaseMetadataSource,
    /import \{verifyPublicWebConfig\} from '\.\/verify-public-web-config\.mjs'/,
  );
  assert.match(releaseMetadataSource, /verifyPublicWebConfig\(outputDirectory\)/);

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-public-config-'));
  try {
    const dist = path.join(cwd, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(
      path.join(cwd, '.env.production'),
      Object.entries(PUBLIC_FIXTURE).map(([name, value]) => `${name}=${value}`).join('\n'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(dist, 'app.js'),
      Object.values(PUBLIC_FIXTURE).map((value) => JSON.stringify(value)).join(';'),
      'utf8',
    );

    assert.doesNotThrow(() => verifyPublicWebConfig('dist', { cwd, env: {} }));

    fs.writeFileSync(
      path.join(dist, 'app.js'),
      JSON.stringify(PUBLIC_FIXTURE.EXPO_PUBLIC_SUPABASE_URL),
      'utf8',
    );
    assert.throws(
      () => verifyPublicWebConfig('dist', { cwd, env: {} }),
      /did not inline required public configuration/,
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
