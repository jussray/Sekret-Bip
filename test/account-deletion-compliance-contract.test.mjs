import test from 'node:test';
import { fetchExpiredPendingRequests } from '../scripts/sweep-account-deletions.mjs';
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
