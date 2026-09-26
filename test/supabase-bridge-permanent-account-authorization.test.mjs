import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260814033200_harden_bridge_permanent_account_policies.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'bridge_permanent_account_authorization.sql',
);
const servicePath = path.join(root, 'src', 'services', 'bridgeSummaryService.ts');

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const service = fs.readFileSync(servicePath, 'utf8');

test('Bridge permanent-account migration and rollback-contained probe exist', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.equal(fs.existsSync(probePath), true);
  assert.match(probe, /begin;/i);
  assert.match(probe, /create temp table bridge_permanent_account_results/i);
  assert.match(probe, /rollback;/i);
});

test('Bridge request and source direct mutation policies are removed and never recreated', () => {
  for (const policy of [
    'bridge_share_requests_teen_insert',
    'bridge_share_requests_teen_update',
    'bridge_share_sources_teen_insert',
  ]) {
    assert.match(migration, new RegExp(`drop policy if exists ${policy}`, 'i'));
    assert.doesNotMatch(migration, new RegExp(`create policy ${policy}`, 'i'));
  }
});

test('every Phase-1 Bridge client policy carries the permanent-account predicate', () => {
  const policies = [
    'bridge_share_requests_teen_select',
    'bridge_share_requests_parent_select',
    'bridge_share_sources_teen_select',
    'bridge_summaries_teen_select',
    'bridge_summaries_parent_select',
    'bridge_summary_views_parent_select',
    'bridge_summary_views_parent_insert',
    'bridge_delivery_preferences_owner_all',
  ];

  for (const policy of policies) {
    const start = migration.indexOf(`create policy ${policy}`);
    assert.notEqual(start, -1, `${policy} must be recreated`);
    const nextPolicy = migration.indexOf('create policy ', start + 1);
    const block = migration.slice(start, nextPolicy === -1 ? migration.length : nextPolicy);
    assert.match(block, /public\.is_non_anonymous_user\(\)/i, `${policy} must reject anonymous Auth sessions`);
  }
});

test('linked-parent request and summary reads keep active-link, revocation, expiry, and status boundaries', () => {
  for (const policy of ['bridge_share_requests_parent_select', 'bridge_summaries_parent_select']) {
    const start = migration.indexOf(`create policy ${policy}`);
    const nextPolicy = migration.indexOf('create policy ', start + 1);
    const block = migration.slice(start, nextPolicy === -1 ? migration.length : nextPolicy);
    assert.match(block, /parent_user_id = auth\.uid\(\)/i);
    assert.match(block, /status in \('ready','viewed'\)/i);
    assert.match(block, /revoked_at is null/i);
    assert.match(block, /expires_at is null or .*expires_at > now\(\)/i);
    assert.match(block, /pl\.status = 'active'/i);
    assert.match(block, /pl\.is_active = true/i);
  }
});

test('parent view receipts disappear with the underlying summary authorization', () => {
  const start = migration.indexOf('create policy bridge_summary_views_parent_select');
  const nextPolicy = migration.indexOf('create policy ', start + 1);
  const block = migration.slice(start, nextPolicy);
  assert.match(block, /parent_user_id = auth\.uid\(\)/i);
  assert.match(block, /join public\.bridge_share_requests/i);
  assert.match(block, /join public\.parent_links/i);
  assert.match(block, /r\.status in \('ready','viewed'\)/i);
  assert.match(block, /r\.revoked_at is null/i);
  assert.match(block, /pl\.status = 'active'/i);
  assert.match(block, /pl\.is_active = true/i);
});

test('Bridge revocation RPC rejects anonymous Auth sessions and preserves teen ownership', () => {
  assert.match(migration, /create or replace function public\.revoke_bridge_share_request\(p_request_id uuid\)/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public, pg_temp/i);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/i);
  assert.match(migration, /permanent_account_required/i);
  assert.match(migration, /teen_user_id = v_teen_user_id/i);
  assert.match(migration, /revoke all on function public\.revoke_bridge_share_request\(uuid\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.revoke_bridge_share_request\(uuid\) to authenticated/i);
});

test('legitimate Bridge creation and revocation stay on the reviewed RPC boundary', () => {
  assert.match(service, /\.rpc\('create_bridge_share_request'/i);
  assert.match(service, /\.rpc\('revoke_bridge_share_request'/i);
  assert.doesNotMatch(service, /\.from\('bridge_share_requests'\)[\s\S]{0,160}\.insert\(/i);
  assert.doesNotMatch(service, /\.from\('bridge_share_requests'\)[\s\S]{0,160}\.update\(/i);
  assert.doesNotMatch(service, /\.from\('bridge_share_sources'\)[\s\S]{0,160}\.insert\(/i);
});

test('catalog probe checks anonymous denial, revoked-parent denial, RPC grants, and safe search path', () => {
  assert.match(probe, /phase1_policies_require_permanent_account/i);
  assert.match(probe, /parent_view_receipts_revoke_with_summary_access/i);
  assert.match(probe, /revoke_rpc_requires_permanent_account/i);
  assert.match(probe, /has_function_privilege\([\s\S]*'anon'/i);
  assert.match(probe, /search_path=public,pg_temp/i);
});
