import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migrationPath = 'supabase/migrations/20260718034500_controlled_alpha_relationship_boundaries.sql';
const accessMigrationPath = 'supabase/migrations/20260718035000_deny_blocked_crew_access.sql';
const bridgeIntentMigrationPath = 'supabase/migrations/20260718035500_harden_bridge_source_idempotency.sql';
const probePath = 'supabase/probes/controlled_alpha_relationship_contract.sql';

test('controlled-alpha relationship features stop at the beta audience', async () => {
  const flags = await read('src/constants/relationshipFeatureFlags.ts');

  assert.match(flags, /bridgeSummaries:\s*'beta'/);
  assert.match(flags, /crewAccountability:\s*'beta'/);
  assert.match(flags, /state === 'beta'[\s\S]*audience === 'beta'/);
  assert.doesNotMatch(flags, /bridgeSummaries:\s*'enabled'/);
  assert.doesNotMatch(flags, /crewAccountability:\s*'enabled'/);
});

test('controlled-alpha Worker configuration fails closed until a cohort allowlist is provisioned', async () => {
  const alpha = await read('wrangler.alpha.toml');
  const production = await read('wrangler.toml');

  assert.match(alpha, /name\s*=\s*"sekret-backend-alpha"/);
  assert.match(alpha, /comma-separated allowlist/);
  assert.match(alpha, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"disabled"/);
  assert.doesNotMatch(alpha, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"enabled"/);
  assert.match(production, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"disabled"/);
});

test('Bridge rejects unsupported sources before creating a database request', async () => {
  const service = await read('src/services/bridgeSummaryService.ts');
  const guardIndex = service.indexOf('sources.some((source) => !CONTROLLED_ALPHA_SOURCE_KINDS.has(source.kind))');
  const rpcIndex = service.indexOf("sb.rpc('create_bridge_share_request'");

  assert.match(service, /CONTROLLED_ALPHA_SOURCE_KINDS[\s\S]*'journal'[\s\S]*'mood'/);
  assert.match(service, /Controlled alpha currently supports Journal entries and Mood check-ins only/);
  assert.ok(guardIndex >= 0, 'Bridge source guard must exist');
  assert.ok(rpcIndex >= 0, 'Bridge request RPC must exist');
  assert.ok(guardIndex < rpcIndex, 'unsupported source guard must run before the request RPC');
});

test('Bridge server accepts only owned Journal and Mood sources through the RPC', async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /drop policy if exists bridge_share_requests_teen_insert/);
  assert.match(migration, /drop policy if exists bridge_share_requests_teen_update/);
  assert.match(migration, /drop policy if exists bridge_share_sources_teen_insert/);
  assert.match(migration, /v_source_kind not in \('journal', 'mood'\)/);
  assert.match(migration, /from public\.journal_entries entry[\s\S]*entry\.user_id = v_teen_user_id/);
  assert.match(migration, /from public\.mood_history mood[\s\S]*mood\.user_id = v_teen_user_id/);
  assert.match(migration, /unsupported_or_invalid_source/);
  assert.match(migration, /source_not_available/);
  assert.match(migration, /Direct request\/source mutation policies are intentionally absent/);
});

test('Bridge request intent is null-safe, canonical, duplicate-free, and idempotency-strict', async () => {
  const migration = await read(bridgeIntentMigrationPath);
  const arrayTypeGuard = migration.indexOf("p_sources is null or jsonb_typeof(p_sources) <> 'array'");
  const arrayLengthRead = migration.indexOf('jsonb_array_length(p_sources) = 0');

  assert.ok(arrayTypeGuard >= 0, 'Bridge source array type guard must exist');
  assert.ok(arrayLengthRead > arrayTypeGuard, 'Bridge must validate array type before reading its length');
  assert.match(migration, /v_source_id := \(v_source_id::bigint\)::text/);
  assert.match(migration, /exception when numeric_value_out_of_range/);
  assert.match(migration, /duplicate_source/);
  assert.match(migration, /v_normalized_sources @> jsonb_build_array\(v_normalized_source\)/);
  assert.match(migration, /select id, status, parent_user_id/);
  assert.match(migration, /v_existing_parent_user_id <> p_parent_user_id/);
  assert.match(migration, /v_existing_sources <> v_requested_sources/);
  assert.match(migration, /idempotency_conflict/);
});

test('Crew revocation uses a scoped RPC and treats a null result as no transition', async () => {
  const service = await read('src/services/crewAccountabilityServiceV2.ts');
  const start = service.indexOf('export async function revokeCheckInShare');
  const end = service.indexOf('export async function fetchMyCheckIns');
  const revoke = service.slice(start, end);

  assert.match(revoke, /rpc\('revoke_crew_check_in_share'/);
  assert.match(revoke, /p_check_in_id: checkInId/);
  assert.match(revoke, /p_shared_with: sharedWithUserId/);
  assert.match(revoke, /typeof data !== 'string' \|\| !data/);
  assert.match(revoke, /No active Crew share matched/);
  assert.doesNotMatch(revoke, /from\('crew_check_in_shares'\)/);
  assert.ok(
    revoke.indexOf("return { ok: true, value: { revoked: true } }") > revoke.indexOf("typeof data !== 'string' || !data"),
    'success must occur only after the RPC result guard',
  );
});

test('Crew share mutations are RPC-only and every share owner matches the check-in owner', async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /drop policy if exists crew_check_in_shares_owner_insert/);
  assert.match(migration, /drop policy if exists crew_check_in_shares_owner_update/);
  assert.match(migration, /create or replace function private\.enforce_crew_check_in_share_owner/);
  assert.match(migration, /create trigger crew_check_in_shares_owner_guard/);
  assert.match(migration, /v_check_in_owner <> new\.owner_user_id/);
  assert.match(migration, /not exists \([\s\S]*ci\.owner_user_id = share_row\.owner_user_id/);
  assert.match(migration, /create or replace function public\.revoke_crew_check_in_share/);
  assert.match(migration, /and status = 'active'[\s\S]*returning id into v_share_id/);
  assert.doesNotMatch(migration, /create policy crew_check_in_shares_crew_read/);
  assert.doesNotMatch(migration, /create policy crew_check_ins_crew_read/);
});

test('Crew recipient authorization uses one private non-recursive policy helper', async () => {
  const migration = await read(accessMigrationPath);
  const policySection = migration.slice(migration.indexOf('drop policy if exists crew_check_in_shares_crew_read'));

  assert.match(migration, /create schema if not exists private/);
  assert.match(migration, /create or replace function private\.crew_check_in_access_is_active/);
  assert.match(migration, /from public\.crew_check_ins ci/);
  assert.match(migration, /from public\.crew_check_in_shares share_row/);
  assert.match(migration, /accepted\.connection_status = 'accepted'/);
  assert.match(migration, /blocked\.connection_status = 'blocked'/);
  assert.match(migration, /blocked\.user_id = p_owner_user_id and blocked\.member_user_id = p_member_user_id/);
  assert.match(migration, /blocked\.user_id = p_member_user_id and blocked\.member_user_id = p_owner_user_id/);
  assert.match(policySection, /private\.crew_check_in_access_is_active\(/g);
  assert.doesNotMatch(policySection, /from public\.crew_check_ins/);
  assert.doesNotMatch(policySection, /from public\.crew_check_in_shares/);
  assert.doesNotMatch(migration, /create or replace function public\.crew_pair_is_unblocked/);
});

test('controlled-alpha SQL migrations are complete transaction units with balanced function bodies', async () => {
  for (const path of [migrationPath, accessMigrationPath, bridgeIntentMigrationPath]) {
    const migration = await read(path);
    assert.match(migration, /^begin;/);
    assert.match(migration, /commit;\s*$/);
    assert.equal((migration.match(/\$\$/g) ?? []).length % 2, 0, `${path} has unbalanced dollar quotes`);
    assert.equal((migration.match(/\bbegin;/g) ?? []).length >= 1, true);
    assert.equal((migration.match(/\bcommit;/g) ?? []).length, 1);
  }
});

test('relationship parity probe is catalog-only, rollback-contained, and checks the hardened boundaries', async () => {
  const probe = await read(probePath);

  assert.match(probe, /^-- Se'kret Bip controlled-alpha relationship contract probe/);
  assert.match(probe, /begin;/);
  assert.match(probe, /rollback;\s*$/);
  assert.match(probe, /from pg_policies/);
  assert.match(probe, /from pg_proc/);
  assert.match(probe, /from pg_trigger/);
  assert.match(probe, /has_function_privilege/);
  assert.match(probe, /private\.crew_check_in_access_is_active/);
  assert.match(probe, /bridge_create_rpc_enforces_owned_alpha_sources/);
  assert.match(probe, /crew_policies_call_private_helper_without_cross_table_subqueries/);
  assert.doesNotMatch(probe, /insert into public\./);
  assert.doesNotMatch(probe, /update public\./);
  assert.doesNotMatch(probe, /delete from public\./);
  assert.doesNotMatch(probe, /select[\s\S]{0,80}from public\.(journal_entries|mood_history|bridge_share_requests|bridge_summaries|crew_check_ins|crew_check_in_shares|crew_encouragements)/i);
});
