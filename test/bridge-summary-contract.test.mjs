import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../supabase/migrations/20260705010000_bridge_summary_contract.sql',
  import.meta.url,
);

const sql = await readFile(migrationPath, 'utf8');

const reactivationMigrationPath = new URL(
  '../supabase/migrations/20260706000000_reactivate_revoked_bridge_share_requests.sql',
  import.meta.url,
);

const reactivationSql = await readFile(reactivationMigrationPath, 'utf8');

test('Bridge migration removes legacy raw parent read policies', () => {
  assert.match(sql, /drop policy if exists "journal_entries: linked_parent_read_shared"/i);
  assert.match(sql, /drop policy if exists "mood_history: linked_parent_read_shared"/i);
  assert.match(sql, /drop policy if exists bridge_shares_linked_parent_select/i);
});

test('parent summary access requires an active link and an unrevoked request', () => {
  assert.match(sql, /create policy bridge_summaries_parent_select/i);
  assert.match(sql, /r\.revoked_at is null/i);
  assert.match(sql, /pl\.status = 'active'/i);
  assert.match(sql, /pl\.is_active = true/i);
});

test('source references have no parent select policy', () => {
  assert.match(sql, /create policy bridge_share_sources_teen_select/i);
  assert.doesNotMatch(sql, /create policy bridge_share_sources_parent_select/i);
});

test('Bridge request creation is authenticated, bounded, and idempotent', () => {
  assert.match(sql, /create or replace function public\.create_bridge_share_request/i);
  assert.match(sql, /jsonb_array_length\(p_sources\) > 20/i);
  assert.match(sql, /unique \(teen_user_id, idempotency_key\)/i);
  assert.match(sql, /active_parent_link_required/i);
});

test('revocation immediately changes request state', () => {
  assert.match(sql, /create or replace function public\.revoke_bridge_share_request/i);
  assert.match(sql, /set status = 'revoked'/i);
  assert.match(sql, /revoked_at = now\(\)/i);
});

test('revoked Bridge requests can be safely replaced after active-link revalidation', () => {
  assert.match(reactivationSql, /create or replace function public\.create_bridge_share_request/i);
  assert.match(reactivationSql, /pg_advisory_xact_lock/i);
  assert.match(reactivationSql, /hashtextextended\(v_teen_user_id::text \|\| ':' \|\| v_normalized_idempotency_key, 0\)/i);
  assert.match(reactivationSql, /for update/i);
  assert.match(reactivationSql, /v_existing_status in \('revoked','expired','failed','deleted'\)/i);
  assert.match(reactivationSql, /active_parent_link_required/i);
  assert.match(reactivationSql, /revoked_at = null/i);
  assert.match(reactivationSql, /delete from public\.bridge_share_sources/i);
  assert.match(reactivationSql, /delete from public\.bridge_summaries/i);
  assert.match(reactivationSql, /v_existing_status is null or v_existing_status in \('revoked','expired','failed','deleted'\)/i);
});
