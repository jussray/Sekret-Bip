import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';

// Synthetic REST responses only: this test must never contact live Supabase
// or invoke account-delete, even when the runner has production environment values.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = resolve(root, 'scripts/sweep-account-deletions.mjs');
const preload = `
globalThis.fetch = async (input, options = {}) => {
  const requestUrl = new URL(String(input));
  if (requestUrl.pathname !== '/rest/v1/account_deletion_requests') {
    throw new Error('UNEXPECTED_NETWORK_OR_DESTRUCTIVE_CALL');
  }
  if (options.headers?.['Accept-Profile'] !== 'public') {
    return new Response(JSON.stringify({ code: 'PGRST205', message: "Could not find the table 'api.account_deletion_requests'" }), { status: 404 });
  }
  if (process.env.MOCK_PUBLIC_TABLE_MISSING === 'true') {
    return new Response(JSON.stringify({ code: 'PGRST205', message: "Could not find the table 'public.account_deletion_requests'" }), { status: 404 });
  }
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
};
`;

function runMockSweep(overrides = {}) {
  return spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, script], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    env: {
      ...process.env,
      SUPABASE_URL: 'https://mock.supabase.invalid',
      SUPABASE_SECRET_KEY: 'fake-service-role-for-test',
      SUPABASE_SERVICE_ROLE_KEY: '',
      ACCOUNT_DELETION_PROCESS_SECRET: 'fake-processing-secret-for-test',
      ...overrides,
    },
  });
}

test('account-deletion sweep queries the canonical public schema without processing rows', () => {
  const result = runMockSweep();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /found 0 expired pending request\(s\)/);
  assert.match(result.stdout, /processed 0 request\(s\) successfully/);
});

test('account-deletion sweep fails closed when the public table is genuinely missing', () => {
  const result = runMockSweep({ MOCK_PUBLIC_TABLE_MISSING: 'true' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /list_failed:404/);
  assert.doesNotMatch(result.stdout, /processed .* successfully/);
});
