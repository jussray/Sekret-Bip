import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260821071500_harden_anonymous_permanent_account_boundaries.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');

function policyBody(sql, policyName, tableName) {
  const marker = `create policy ${policyName}`;
  const start = sql.indexOf(marker);
  assert.notEqual(start, -1, `missing policy ${policyName}`);

  const next = sql.indexOf('\ncreate policy ', start + marker.length);
  const functionStart = sql.indexOf('\ncreate or replace function ', start + marker.length);
  const commitStart = sql.indexOf('\ncommit;', start + marker.length);
  const candidates = [next, functionStart, commitStart].filter(index => index !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : sql.length;
  const body = sql.slice(start, end);
  assert.match(body, new RegExp(`on public\\.${tableName.replace('.', '\\.')}\\b`));
  return body;
}

test('anonymous sessions cannot write or read the canonical Bip event ledger', async () => {
  const sql = await readMigration();
  const body = policyBody(sql, 'bip_events_permanent_owner_all', 'bip_events');

  assert.match(body, /for all\s+to authenticated/);
  assert.match(body, /public\.is_non_anonymous_user\(\)/);
  assert.match(body, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(sql, /revoke all on table public\.bip_events from public, anon, authenticated/);
});

test('live-only legacy activity events are hardened without breaking a clean replay', async () => {
  const sql = await readMigration();

  assert.match(sql, /if to_regclass\('public\.activity_events'\) is not null then/);
  assert.match(sql, /create policy activity_events_permanent_owner_insert on public\.activity_events for insert to authenticated with check \(public\.is_non_anonymous_user\(\) and \(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /create policy activity_events_permanent_owner_select on public\.activity_events for select to authenticated using \(public\.is_non_anonymous_user\(\) and \(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(sql, /^alter table public\.activity_events/m);
});

test('point and task read policies require a permanent account', async () => {
  const sql = await readMigration();
  const requiredPolicies = [
    ['app_point_awards_owner_read', 'app_point_awards'],
    ['point_inactivity_adjustments_owner_read', 'point_inactivity_adjustments'],
    ['point_balances_owner_read', 'point_balances'],
    ['point_balances_linked_guardian_read', 'point_balances'],
    ['point_transactions_owner_read', 'point_transactions'],
    ['bip_tasks_teen_select', 'bip_tasks'],
    ['bip_tasks_linked_parent_select', 'bip_tasks'],
    ['task_submissions_teen_select', 'task_submissions'],
    ['task_submissions_linked_parent_select', 'task_submissions'],
  ];

  for (const [policyName, tableName] of requiredPolicies) {
    const body = policyBody(sql, policyName, tableName);
    assert.match(body, /public\.is_non_anonymous_user\(\)/, `${policyName} must reject anonymous sessions`);
  }
});

test('reward redemption reads harden both production and clean-replay owner column variants', async () => {
  const sql = await readMigration();

  assert.match(sql, /table_name = 'reward_redemptions'[\s\S]*column_name = 'user_id'/);
  assert.match(sql, /reward_redemptions_owner_read on public\.reward_redemptions for select to authenticated using \(public\.is_non_anonymous_user\(\) and \(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /table_name = 'reward_redemptions'[\s\S]*column_name = 'teen_id'/);
  assert.match(sql, /reward_redemptions_owner_read on public\.reward_redemptions for select to authenticated using \(public\.is_non_anonymous_user\(\) and \(select auth\.uid\(\)\) = teen_id\)/);
  assert.match(sql, /raise exception 'reward_redemptions_owner_column_missing'/);
});

test('task mutations retain role/link rules while adding the permanent-account gate', async () => {
  const sql = await readMigration();

  const teenInsert = policyBody(sql, 'bip_tasks_teen_insert', 'bip_tasks');
  assert.match(teenInsert, /public\.is_non_anonymous_user\(\)/);
  assert.match(teenInsert, /created_by_role = 'teen'/);
  assert.match(teenInsert, /point_value = 0/);
  assert.match(teenInsert, /requires_approval = false/);

  const parentInsert = policyBody(sql, 'bip_tasks_linked_parent_insert', 'bip_tasks');
  assert.match(parentInsert, /public\.is_non_anonymous_user\(\)/);
  assert.match(parentInsert, /created_by_role = 'parent'/);
  assert.match(parentInsert, /pl\.status = 'active'/);
  assert.match(parentInsert, /pl\.is_active = true/);

  const teenUpdate = policyBody(sql, 'bip_tasks_teen_update', 'bip_tasks');
  assert.match(teenUpdate, /public\.is_non_anonymous_user\(\)/);

  const parentUpdate = policyBody(sql, 'bip_tasks_linked_parent_update', 'bip_tasks');
  assert.match(parentUpdate, /public\.is_non_anonymous_user\(\)/);
  assert.match(parentUpdate, /pl\.status = 'active'/);
  assert.match(parentUpdate, /pl\.is_active = true/);
});

test('public circle pseudonym RPC rejects anonymous authenticated users before bypassing table RLS', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('create or replace function public.get_public_circle_profiles');
  assert.notEqual(start, -1);
  const body = sql.slice(start);

  assert.match(body, /auth\.uid\(\) is null/);
  assert.match(body, /auth\.jwt\(\) ->> 'is_anonymous'/);
  assert.match(body, /raise exception 'permanent_account_required'/);
  assert.match(body, /revoke all on function public\.get_public_circle_profiles\(uuid\[\]\) from public, anon/);
  assert.match(body, /grant execute on function public\.get_public_circle_profiles\(uuid\[\]\) to authenticated/);
});

test('boundary migration is scoped to access control and does not mutate reward inventory or point balances directly', async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /insert into public\.(?:point_transactions|point_balances|reward_redemptions)/i);
  assert.doesNotMatch(sql, /update public\.(?:point_transactions|point_balances|rewards|reward_redemptions)/i);
  assert.doesNotMatch(sql, /delete from public\.(?:point_transactions|point_balances|rewards|reward_redemptions)/i);
  assert.doesNotMatch(sql, /drop table/i);
});
