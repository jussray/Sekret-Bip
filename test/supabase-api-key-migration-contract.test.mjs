import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const helper = read('supabase/functions/_shared/supabase-api-keys.ts');
const publicClient = read('utils/supabase/client.ts');
const publicEnv = read('src/utils/env.ts');
const mcpGuard = read('scripts/verify-mcp-config.mjs');
const controlRoomServer = read('scripts/control-room-server.mjs');

const publishableFunctions = [
  'supabase/functions/delete-account/index.ts',
  'supabase/functions/parent-link-create/index.ts',
  'supabase/functions/parent-link-revoke/index.ts',
  'supabase/functions/account-request-cancel/index.ts',
  'supabase/functions/account-deletion-request/index.ts',
  'supabase/functions/send-push/index.ts',
].map(read);

const privilegedFunctions = [
  'supabase/functions/account-delete/index.ts',
  'supabase/functions/runtime-contract-health/index.ts',
  'supabase/functions/safety-scan/index.ts',
  'supabase/functions/send-push/index.ts',
].map(read);

const privilegedServerFiles = [
  'scripts/reconcile.ts',
  'scripts/control-room-record-release.mjs',
  'scripts/sweep-account-deletions.mjs',
  'scripts/control-room-ingest-scans.mjs',
  'scripts/control-room-ingest-worker-logs.mjs',
  'scripts/control-room-ingest-supabase-advisors.mjs',
  'scripts/control-room-ingest-local-report.mjs',
  'scripts/control-room-ingest-github-failures.mjs',
  'scripts/control-room-ingest-github-test-skips.mjs',
  'worker/audit/persist-event.ts',
].map((path) => ({ path, source: read(path) }));

test('Edge Function key resolver prefers modern named dictionaries before legacy fallbacks', () => {
  assert.match(helper, /SUPABASE_PUBLISHABLE_KEYS/);
  assert.match(helper, /SUPABASE_SECRET_KEYS/);
  assert.match(helper, /parsed\?\.default/);

  const publishableDictionary = helper.indexOf("readNamedDefault('SUPABASE_PUBLISHABLE_KEYS')");
  const publishableLegacy = helper.indexOf("Deno.env.get('SUPABASE_ANON_KEY')");
  assert.ok(publishableDictionary >= 0 && publishableLegacy > publishableDictionary);

  const secretDictionary = helper.indexOf("readNamedDefault('SUPABASE_SECRET_KEYS')");
  const secretLegacy = helper.indexOf("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
  assert.ok(secretDictionary >= 0 && secretLegacy > secretDictionary);
});

test('user-session Edge Functions consume the shared publishable-key resolver', () => {
  for (const source of publishableFunctions) {
    assert.match(source, /getSupabasePublishableKey/);
    assert.doesNotMatch(source, /Deno\.env\.get\(['\"]SUPABASE_ANON_KEY['\"]\)/);
  }
});

test('privileged Edge Functions consume the shared secret-key resolver', () => {
  for (const source of privilegedFunctions) {
    assert.match(source, /getSupabaseSecretKey/);
    assert.doesNotMatch(source, /Deno\.env\.get\(['\"]SUPABASE_SERVICE_ROLE_KEY['\"]\)/);
  }
});

test('privileged server and Worker consumers prefer the modern singular secret key', () => {
  for (const { path, source } of privilegedServerFiles) {
    const modern = source.indexOf('SUPABASE_SECRET_KEY');
    const legacy = source.indexOf('SUPABASE_SERVICE_ROLE_KEY');
    assert.ok(modern >= 0, `${path} must accept SUPABASE_SECRET_KEY`);
    assert.ok(legacy >= 0, `${path} must retain the temporary rollback fallback during migration`);
    assert.ok(modern < legacy, `${path} must prefer SUPABASE_SECRET_KEY before the legacy fallback`);
  }
});

test('secret detectors recognize modern and legacy privileged Supabase key names', () => {
  for (const source of [mcpGuard, controlRoomServer]) {
    assert.match(source, /SUPABASE_SECRET_KEY/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  }
});

test('public app remains publishable-key-first and never reads privileged Supabase keys', () => {
  for (const source of [publicClient, publicEnv]) {
    assert.match(source, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(source, /process\.env\.(?:SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS|SUPABASE_SERVICE_ROLE_KEY)/);
  }
});
