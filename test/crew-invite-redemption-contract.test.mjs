import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// redeem_crew_invite(p_invite_code, p_first_name) had zero test coverage
// despite being a client-callable SECURITY DEFINER RPC that creates a Crew
// relationship and returns a private display name — exactly the class of
// high-blast-radius authenticated RPC issue #399 asks to prove ownership,
// input, and search-path boundaries for (SPRINT.md "Next execution order",
// item 2: positive/negative behavior tests instead of blind revocation).
//
// This is a static source-assertion test (no live Supabase calls), matching
// the pattern already used by test/controlled-alpha-crew-access-hardening.test.mjs.
const migrationPath = 'supabase/migrations/20260714183200_guard_crew_invite_acceptance.sql';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('redeem_crew_invite is SECURITY DEFINER, search_path pinned, and client-execute is bounded', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /create or replace function public\.redeem_crew_invite/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, pg_temp/);
  assert.match(sql, /revoke all on function public\.redeem_crew_invite\(text, text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.redeem_crew_invite\(text, text\) to authenticated/);
});

test('redeem_crew_invite rejects anonymous callers and malformed or unknown invite codes', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /v_user_id is null\s*\n\s*or coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/);
  assert.match(sql, /raise exception 'permanent_account_required' using errcode = '42501'/);

  assert.match(sql, /upper\(trim\(p_invite_code\)\) !~ '\^\[A-Z0-9\]\{4,32\}\$'/);
  assert.match(sql, /raise exception 'invalid_invite_code' using errcode = '22023'/);

  assert.match(sql, /if not found then raise exception 'invite_not_found' using errcode = 'P0002'; end if;/);
});

test('redeem_crew_invite rejects non-pending invites, self-redemption, and blocked relationships', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /v_invite\.connection_status <> 'pending' or v_invite\.member_user_id is not null/);
  assert.match(sql, /raise exception 'invite_not_pending' using errcode = '22023'/);

  assert.match(sql, /v_invite\.user_id = v_user_id/);
  assert.match(sql, /raise exception 'cannot_redeem_own_invite' using errcode = '22023'/);

  assert.match(sql, /cm\.connection_status = 'blocked'/);
  assert.match(
    sql,
    /\(cm\.user_id = v_invite\.user_id and cm\.member_user_id = v_user_id\)\s*\n\s*or \(cm\.user_id = v_user_id and cm\.member_user_id = v_invite\.user_id\)/,
  );

  assert.match(sql, /v_existing\.connection_status = 'accepted'/);
  assert.match(sql, /raise exception 'crew_connection_already_accepted' using errcode = '23505'/);
});

test('redeem_crew_invite requires completed profiles on both sides of the relationship', async () => {
  const sql = await read(migrationPath);

  assert.match(sql, /where user_id = v_user_id and onboarding_complete is true/);
  assert.match(sql, /raise exception 'completed_account_profile_required' using errcode = '42501'/);

  assert.match(sql, /where user_id = v_invite\.user_id\s*\n\s*and onboarding_complete is true/);
  assert.match(sql, /raise exception 'crew_owner_profile_incomplete' using errcode = '42501'/);
});

test('redeem_crew_invite ignores the caller-supplied name and returns only the server-verified display name', async () => {
  const sql = await read(migrationPath);

  // p_first_name is accepted for backward-compatible call shape but never
  // read anywhere in the function body -- the returned display_name always
  // comes from v_private_name, looked up server-side from the redeeming
  // caller's own app_profiles row, not from client input.
  assert.match(sql, /The p_first_name argument is retained for compatibility but intentionally ignored/);
  assert.match(sql, /select nullif\(trim\(private_display_name\), ''\) into v_private_name/);
  assert.match(sql, /select v_invite\.user_id, v_result_id, v_private_name, 'accepted'::text, now\(\)/);

  const body = sql.slice(sql.indexOf('begin\n'), sql.indexOf('$$;'));
  assert.doesNotMatch(body, /p_first_name/);
});
