import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const helper = read('supabase/functions/_shared/supabase-api-keys.ts');
const publicClient = read('utils/supabase/client.ts');
const publicEnv = read('src/utils/env.ts');

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

test('public app remains publishable-key-first and never reads privileged Supabase keys', () => {
  for (const source of [publicClient, publicEnv]) {
    assert.match(source, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SECRET_KEYS|SUPABASE_SERVICE_ROLE_KEY/);
  }
});
