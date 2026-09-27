import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// apply_inactivity_point_adjustment, submit_bip_task, review_task_submission,
// request_reward_redemption, and review_reward_redemption are client-callable
// SECURITY DEFINER RPCs that move real point balances and reward inventory,
// with zero prior test coverage. This is SPRINT.md "Next execution order"
// item 2: positive/negative behavior tests instead of blind revocation.
//
// Static source-assertion test (no live Supabase calls), matching the
// pattern used by test/crew-invite-redemption-contract.test.mjs. Source is
// read from the latest migration that (re)defines each function; the
// energy-fade function's canonical definition is the later
// 20260714051500 migration, not its original 20260704 predecessor.
const energyPath = 'supabase/migrations/20260714051500_align_bip_energy_with_bip_events.sql';
const rewardsPath = 'supabase/migrations/20260704050000_sync_points_chores_rewards.sql';
const tasksPath = 'supabase/migrations/20260704040000_fix_task_rpc_event_column.sql';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('apply_inactivity_point_adjustment is self-scoped via auth.uid() with no caller-suppliable target', async () => {
  const sql = await read(energyPath);

  assert.match(sql, /create or replace function public\.apply_inactivity_point_adjustment\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /v_user uuid := auth\.uid\(\)/);
  assert.match(sql, /if v_user is null then\s*\n\s*raise exception 'authentication required'/);

  assert.match(sql, /revoke all on function public\.apply_inactivity_point_adjustment\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.apply_inactivity_point_adjustment\(\) to authenticated/);
});

test('apply_inactivity_point_adjustment never deducts below zero and is capped at 5 points per day', async () => {
  const sql = await read(energyPath);

  assert.match(sql, /v_balance := coalesce\(v_balance, 0\)/);
  assert.match(sql, /if v_balance <= 0 then/);
  assert.match(sql, /reason', 'no_balance'/);
  assert.match(sql, /v_adjustment := least\(v_balance, least\(5, greatest\(1, v_days_away - 1\)\)\)/);
});

test('apply_inactivity_point_adjustment is idempotent per calendar day', async () => {
  const energySql = await read(energyPath);
  const rewardsSql = await read(rewardsPath);

  // The one-row-per-day uniqueness constraint is defined once, in the
  // table-creation migration; the later energy-fade migration only
  // replaces the function body and relies on that existing constraint.
  assert.match(rewardsSql, /primary key \(user_id, adjustment_date\)/);

  assert.match(energySql, /on conflict do nothing/);
  assert.match(energySql, /get diagnostics v_rows = row_count/);
  assert.match(energySql, /if v_rows = 0 then/);
  assert.match(energySql, /reason', 'already_checked_today'/);
});

test('submit_bip_task requires teen ownership and an actionable task status', async () => {
  const sql = await read(tasksPath);

  assert.match(sql, /create or replace function public\.submit_bip_task/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);

  assert.match(sql, /where id = p_task_id\s*\n\s*and teen_id = v_user\s*\n\s*and status in \('active','rejected'\)/);
  assert.match(sql, /if not found then\s*\n\s*raise exception 'task not available'/);

  assert.match(sql, /revoke all on function public\.submit_bip_task\(uuid,text,text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.submit_bip_task\(uuid,text,text\) to authenticated/);
});

test('submit_bip_task only auto-awards points and emits a bip_event when the task does not require approval', async () => {
  const sql = await read(tasksPath);
  const body = sql.slice(
    sql.indexOf('create or replace function public.submit_bip_task'),
    sql.indexOf('create or replace function public.review_task_submission'),
  );

  assert.match(body, /case when v_requires_approval then 'pending' else 'approved' end/);
  assert.match(body, /case when v_requires_approval then 'submitted' else 'completed' end/);
  assert.match(body, /if not v_requires_approval then/);
  assert.match(body, /insert into public\.bip_events\(user_id, event_type, meta\)/);
});

test('review_task_submission requires an active parent_links relationship to the submitting teen', async () => {
  const sql = await read(tasksPath);
  const body = sql.slice(sql.indexOf('create or replace function public.review_task_submission'));

  assert.match(body, /security definer/);
  assert.match(body, /and ts\.status = 'pending'/);
  assert.match(body, /if not found then\s*\n\s*raise exception 'submission not pending'/);

  assert.match(body, /where pl\.teen_user_id = v_teen\s*\n\s*and pl\.parent_user_id = v_parent\s*\n\s*and pl\.status = 'active'/);
  assert.match(body, /raise exception 'not authorized'/);

  assert.match(body, /revoke all on function public\.review_task_submission\(uuid,boolean,text\) from public, anon/);
  assert.match(body, /grant execute on function public\.review_task_submission\(uuid,boolean,text\) to authenticated/);
});

test('review_task_submission only awards points on approval, never on rejection', async () => {
  const sql = await read(tasksPath);
  const body = sql.slice(sql.indexOf('create or replace function public.review_task_submission'));

  assert.match(body, /case when p_approve then 'approved' else 'rejected' end/);
  assert.match(body, /case when p_approve then 'completed' else 'rejected' end/);
  assert.match(body, /if p_approve then/);

  const approvalBranch = body.slice(body.indexOf('if p_approve then'), body.indexOf('return jsonb_build_object'));
  assert.match(approvalBranch, /insert into public\.point_transactions/);
});

test('request_reward_redemption locks the reward and balance rows and rejects insufficient points or out-of-stock rewards', async () => {
  const sql = await read(rewardsPath);
  const body = sql.slice(
    sql.indexOf('create or replace function public.request_reward_redemption'),
    sql.indexOf('create or replace function public.review_reward_redemption'),
  );

  assert.match(body, /security definer/);
  assert.match(body, /set search_path = public/);
  assert.match(body, /where id = p_reward_id and active = true\s*\n\s*for update/);
  assert.match(body, /if not found then raise exception 'reward_not_found'; end if;/);
  assert.match(body, /if v_reward\.inventory_count is not null and v_reward\.inventory_count <= 0 then/);
  assert.match(body, /raise exception 'out_of_stock'/);

  assert.match(body, /where user_id = v_user_id\s*\n\s*for update/);
  assert.match(body, /if v_balance < v_reward\.point_cost then raise exception 'insufficient_points'; end if;/);
});

test('request_reward_redemption reserves points immediately and routes parent-gated rewards to pending_parent', async () => {
  const sql = await read(rewardsPath);
  const body = sql.slice(
    sql.indexOf('create or replace function public.request_reward_redemption'),
    sql.indexOf('create or replace function public.review_reward_redemption'),
  );

  assert.match(body, /v_status := case when v_reward\.requires_parent_approval then 'pending_parent' else 'approved' end/);
  assert.match(body, /-v_reward\.point_cost,\s*\n\s*'Reward redemption reserved',\s*\n\s*'reserve',/);

  assert.match(sql, /revoke all on function public\.request_reward_redemption\(uuid\) from public, anon/);
  assert.match(sql, /grant execute on function public\.request_reward_redemption\(uuid\) to authenticated/);
});

test('review_reward_redemption requires an active parent_links relationship and only mutates pending_parent redemptions', async () => {
  const sql = await read(rewardsPath);
  const body = sql.slice(sql.indexOf('create or replace function public.review_reward_redemption'));

  assert.match(body, /security definer/);
  assert.match(body, /and rr\.status = 'pending_parent'\s*\n\s*for update/);
  assert.match(body, /if not found then raise exception 'redemption_not_pending'; end if;/);

  assert.match(body, /where pl\.teen_user_id = v_redemption\.teen_id\s*\n\s*and pl\.parent_user_id = v_parent\s*\n\s*and pl\.status = 'active'/);
  assert.match(body, /raise exception 'not_authorized'/);

  assert.match(sql, /revoke all on function public\.review_reward_redemption\(uuid,boolean,text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.review_reward_redemption\(uuid,boolean,text\) to authenticated/);
});

test('review_reward_redemption releases the point reservation and restores inventory only on rejection', async () => {
  const sql = await read(rewardsPath);
  const body = sql.slice(sql.indexOf('create or replace function public.review_reward_redemption'));

  assert.match(body, /if not p_approve then/);
  const rejectionBranch = body.slice(body.indexOf('if not p_approve then'), body.indexOf('return jsonb_build_object'));
  assert.match(rejectionBranch, /'Reward reservation released',\s*\n\s*'release',/);
  assert.match(rejectionBranch, /r\.inventory_count \+ 1/);
});
