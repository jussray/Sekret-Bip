import test from 'node:test';
import { fetchExpiredPendingRequests, runDeletionSweep } from '../scripts/sweep-account-deletions.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const processor = read('supabase/functions/account-delete/index.ts');
const sweeper = read('scripts/sweep-account-deletions.mjs');
const workflow = read('.github/workflows/account-deletion-sweep.yml');
const migration = read('supabase/migrations/20260628190000_account_deletion_requests.sql');
const runbook = read('docs/compliance/account-deletion-runbook.md');

const requiredSecret = 'ACCOUNT_DELETION_PROCESS_SECRET';

test('deletion processor, sweeper, workflow, and runbook use one secret contract', () => {
  for (const [name, content] of Object.entries({ processor, sweeper, workflow, runbook })) {
    assert.match(content, new RegExp(requiredSecret), `${name} must use ${requiredSecret}`);
  }

  assert.doesNotMatch(processor, /\bDELETION_SECRET\b/);
  assert.doesNotMatch(sweeper, /\bDELETION_SECRET\b/);
  assert.doesNotMatch(workflow, /\bDELETION_SECRET\b/);
});

test('daily sweep invokes the canonical account-delete function', () => {
  assert.match(workflow, /schedule:[\s\S]*cron:/);
  assert.match(workflow, /node scripts\/sweep-account-deletions\.mjs/);
  assert.match(sweeper, /\/functions\/v1\/account-delete/);
  assert.match(processor, /x-account-deletion-secret/);
});

test('deletion schema preserves grace-period and state safeguards', () => {
  assert.match(migration, /scheduled_for timestamptz not null default \(now\(\) \+ interval '7 days'\)/);
  assert.match(migration, /status in \('pending', 'cancelled', 'processing', 'completed', 'failed'\)/);
  assert.match(processor, /grace_period_active/);
  assert.match(processor, /request_already_claimed/);
});

test('runbook rejects the stale duplicate implementation names', () => {
  assert.match(runbook, /Do not create a second `process-deletions` function/);
  assert.match(runbook, /duplicate `20260724_compliance_foundation\.sql` migration/);
  assert.match(runbook, /account-delete --no-verify-jwt/);
});


test('sweeper selects the public schema and reads pending IDs before any privileged processing', async () => {
  const seen = [];
  const ids = await fetchExpiredPendingRequests({
    nowIso: '2026-10-24T12:00:00.000Z',
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return { ok: true, text: async () => JSON.stringify([{ id: 'request-one' }]) };
    },
  });
  assert.deepEqual(ids, ['request-one']);
  assert.equal(seen.length, 1);
  assert.match(seen[0].url, /status=eq.pending/);
  assert.equal(seen[0].init.headers['Accept-Profile'], 'public');
});

test('sweeper fails closed when public relation is unavailable, without echoing response contents', async () => {
  await assert.rejects(
    fetchExpiredPendingRequests({
          fetchImpl: async () => ({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({
          code: 'PGRST205',
          message: 'private account identifier must not appear in CI logs',
        }),
      }),
    }),
    (error) => {
      assert.match(error.message, /schema_public_unavailable:public.account_deletion_requests/);
      assert.doesNotMatch(error.message, /private account identifier/);
      return true;
    },
  );
});


test('read-only sweep probe scans pending requests without calling the deletion processor', async () => {
  const calls = [];
  const result = await runDeletionSweep({
    checkOnly: true,
    fetchImpl: async (url, options) => {
      calls.push({ url, method: options?.method ?? 'GET' });
      return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'request-synthetic' }]) };
    },
  });
  assert.deepEqual(result, { mode: 'check-only', queueReadable: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.match(calls[0].url, /\/rest\/v1\/account_deletion_requests/);
});

test('read-only sweep probe fails closed when the public API profile is unavailable', async () => {
  const calls = [];
  await assert.rejects(
    runDeletionSweep({
      checkOnly: true,
      fetchImpl: async (url, options) => {
        calls.push({ url, method: options?.method ?? 'GET' });
        return {
          ok: false,
          status: 406,
          text: async () => JSON.stringify({ code: 'PGRST106', message: 'internal value must not be echoed' }),
        };
      },
    }),
    /schema_public_unavailable:public\.account_deletion_requests/,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
});

test('ordinary sweep still dispatches account-delete after listing expired requests', async () => {
  const calls = [];
  const result = await runDeletionSweep({
    checkOnly: false,
    fetchImpl: async (url, options) => {
      calls.push({ url, method: options?.method ?? 'GET' });
      if (url.includes('/rest/v1/account_deletion_requests')) {
        return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'request-synthetic' }]) };
      }
      return { ok: true, status: 200 };
    },
  });
  assert.deepEqual(result, { mode: 'process', failures: 0 });
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST']);
  assert.match(calls[1].url, /\/functions\/v1\/account-delete/);
});
