import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = 'supabase/migrations/20260811132600_reconcile_onboarding_and_moods_contract.sql';

const policyBlock = (sql, policyName) =>
  sql.match(new RegExp(
    `create policy ${policyName}[\\s\\S]*?(?=create policy|create or replace function|$)`,
    'i',
  ))?.[0] ?? '';

test('onboarding state is permanent-account owner scoped', async () => {
  const sql = await read(migration);

  assert.match(sql, /revoke all on table public\.user_onboarding_state from public, anon, authenticated/);
  assert.match(sql, /grant select, insert, update on table public\.user_onboarding_state to authenticated/);

  for (const policyName of [
    'onboarding_state_permanent_owner_select',
    'onboarding_state_permanent_owner_insert',
    'onboarding_state_permanent_owner_update',
  ]) {
    const policy = policyBlock(sql, policyName);
    assert.ok(policy, `missing ${policyName}`);
    assert.match(policy, /public\.is_non_anonymous_user\(\)/);
    assert.match(policy, /\(select auth\.uid\(\)\) = user_id/);
  }

  assert.doesNotMatch(sql, /grant[^;]*delete[^;]*user_onboarding_state/i);
});

test('client inserts start at the signed-up unknown-role baseline', async () => {
  const sql = await read(migration);

  assert.match(sql, /tg_op = 'INSERT' and v_request_role = 'authenticated'/);
  assert.match(sql, /new\.stage <> 'signed_up'/);
  assert.match(sql, /new\.role <> 'unknown'/);
  assert.match(sql, /new\.activated_at is not null/);
  assert.match(sql, /new\.linked_parent_id is not null/);
  assert.match(sql, /invalid client onboarding insert baseline/);
});

test('database rejects stage regression and assigned-role rewrites', async () => {
  const sql = await read(migration);

  assert.match(sql, /onboarding_stage_rank\(new\.stage\)/);
  assert.match(sql, /v_stage_rank < public\.onboarding_stage_rank\(old\.stage\)/);
  assert.match(sql, /onboarding stage cannot move backward/);
  assert.match(sql, /old\.role <> 'unknown' and new\.role is distinct from old\.role/);
  assert.match(sql, /onboarding role cannot change after assignment/);
  assert.match(sql, /new\.user_id is distinct from old\.user_id/);
});

test('activation and completion metadata remain internally consistent', async () => {
  const sql = await read(migration);

  assert.match(sql, /activation metadata requires an activated stage/);
  assert.match(sql, /activated stage requires activated_at/);
  assert.match(sql, /steady_state requires completed_at/);
  assert.match(sql, /completed_at requires steady_state/);
  assert.match(sql, /activated_at cannot be cleared/);
  assert.match(sql, /completed_at cannot be cleared/);
});

test('onboarding trigger helpers are pinned and not client executable', async () => {
  const sql = await read(migration);

  assert.match(sql, /security definer\s+set search_path = pg_catalog, public/);
  assert.match(sql, /before insert or update on public\.user_onboarding_state/);
  for (const fn of [
    'public.onboarding_stage_rank(public.onboarding_stage)',
    'public.enforce_onboarding_state_transition()',
    'public.handle_first_mood_log()',
  ]) {
    assert.ok(sql.includes(`revoke all on function ${fn}`), `missing EXECUTE revoke for ${fn}`);
  }
});

test('bounded client-reported metadata rejects unapproved shapes', async () => {
  const sql = await read(migration);

  assert.match(sql, /new\.age_bucket not in \('13-15', '16-17', '18-19'\)/);
  assert.match(sql, /char_length\(new\.device_platform\) > 128/);
  assert.match(sql, /char_length\(new\.referral_source\) > 128/);
  assert.match(sql, /char_length\(new\.activation_action\) > 64/);
  assert.match(sql, /new\.activation_action !~ '\^\[a-z0-9_\]\+\$'/);
  assert.match(sql, /Not consent, verification, relationship, or authorization authority/);
});

test('legacy terminal state fails closed instead of receiving an invented mapping', async () => {
  const sql = await read(migration);

  assert.match(sql, /stage::text = 'offboarded'/);
  assert.match(sql, /requires manual review for offboarded rows/);
  assert.doesNotMatch(sql, /when 'offboarded' then 'steady_state'/i);
});

test('moods baseline and first-mood activation are restored together', async () => {
  const sql = await read(migration);

  assert.match(sql, /create table if not exists public\.moods/);
  assert.match(sql, /create policy "moods insert own"/);
  assert.match(sql, /create or replace function public\.handle_first_mood_log\(\)/);
  assert.match(sql, /create trigger trg_first_mood_activation/);
  assert.match(sql, /activation_action = 'first_mood_log'/);
});
