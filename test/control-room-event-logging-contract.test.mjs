import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// log_control_room_runtime_event, upsert_control_room_issue, and
// report_own_audit_event_issue are client-callable SECURITY DEFINER RPCs
// with zero prior test coverage, despite each carrying real blast radius:
// the first accepts a caller-suppliable p_user_id, the second can forge a
// visible founder-facing issue, and the third is a rate-limited self-report
// primitive layered in specifically to close an escalation path the second
// function used to have (see 20260710235500_report_own_audit_event_issue.sql's
// own header comment). This is SPRINT.md "Next execution order" item 2.
//
// Static source-assertion test (no live Supabase calls), matching the
// pattern used by test/crew-invite-redemption-contract.test.mjs.
const loggerPath = 'supabase/migrations/20260701050000_runtime_logger_rpc.sql';
const issuePath = 'supabase/migrations/20260710235500_report_own_audit_event_issue.sql';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('log_control_room_runtime_event is SECURITY DEFINER, search_path pinned, and client-execute is bounded', async () => {
  const sql = await read(loggerPath);

  assert.match(sql, /create or replace function public\.log_control_room_runtime_event/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, auth/);
  assert.match(sql, /revoke all on function public\.log_control_room_runtime_event\(uuid, text, text, text, text, jsonb\) from public/);
  assert.match(sql, /revoke all on function public\.log_control_room_runtime_event\(uuid, text, text, text, text, jsonb\) from anon/);
  assert.match(sql, /grant execute on function public\.log_control_room_runtime_event\(uuid, text, text, text, text, jsonb\) to authenticated/);
  assert.match(sql, /grant execute on function public\.log_control_room_runtime_event\(uuid, text, text, text, text, jsonb\) to service_role/);
});

test('log_control_room_runtime_event blocks a non-service_role caller from logging events for another user', async () => {
  const sql = await read(loggerPath);

  assert.match(sql, /if v_role = 'service_role' then/);
  assert.match(sql, /if v_auth_user is null then\s*\n\s*raise exception 'authentication required' using errcode = '42501'/);
  assert.match(sql, /if p_user_id is not null and p_user_id <> v_auth_user then/);
  assert.match(sql, /raise exception 'cannot log events for another user' using errcode = '42501'/);
});

test('log_control_room_runtime_event validates event_type and restricts severity to a fixed allowlist', async () => {
  const sql = await read(loggerPath);

  assert.match(sql, /if p_event_type is null or btrim\(p_event_type\) = '' then/);
  assert.match(sql, /raise exception 'event_type is required' using errcode = '22023'/);

  assert.match(sql, /if p_severity not in \('critical', 'error', 'warning', 'info'\) then/);
  assert.match(sql, /raise exception 'invalid severity' using errcode = '22023'/);
});

test('log_control_room_runtime_event strips sensitive keys from metadata before insert', async () => {
  const sql = await read(loggerPath);
  const stripBody = sql.slice(sql.indexOf('v_metadata := coalesce'), sql.indexOf('insert into public.audit_events'));

  for (const key of [
    'journalText', 'journal_text',
    'rawAudio', 'raw_audio',
    'audioBlob', 'audio_blob',
    'token', 'access_token', 'refresh_token',
    'apiKey', 'api_key',
    'authorization',
    'conversation', 'conversationText', 'conversation_text',
    'transcript', 'fullTranscript', 'full_transcript',
    'messageText', 'message_text',
    'content', 'payload',
  ]) {
    assert.match(stripBody, new RegExp(`- '${key}'`), `expected ${key} to be stripped from metadata`);
  }
});

test('upsert_control_room_issue requires service_role or is_founder unconditionally, with no owns-the-event bypass', async () => {
  const sql = await read(issuePath);

  assert.match(sql, /create or replace function public\.upsert_control_room_issue/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, auth/);
  assert.match(sql, /if not \(v_role = 'service_role' or public\.is_founder\(\)\) then/);
  assert.match(sql, /raise exception 'not allowed to normalize this event' using errcode = '42501'/);

  // The historical vulnerability this migration closes: an "or the caller
  // owns the referenced audit_events row" branch must not exist anymore.
  const guardBody = sql.slice(sql.indexOf('begin\n', sql.indexOf('function public.upsert_control_room_issue')), sql.indexOf('select id into v_issue_id'));
  assert.doesNotMatch(guardBody, /owns/i);
  assert.doesNotMatch(guardBody, /affected_user_id = auth\.uid\(\)/);
});

test('report_own_audit_event_issue is ownership-checked, severity-gated, and rate-limited', async () => {
  const sql = await read(issuePath);

  assert.match(sql, /create or replace function public\.report_own_audit_event_issue/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, pg_temp/);

  assert.match(sql, /where id = p_event_id\s*\n\s*and user_id = v_auth_user/);
  assert.match(sql, /return query select false, null::uuid, 'event not found'/);

  assert.match(sql, /if v_event\.severity not in \('warning', 'error', 'critical'\) then/);
  assert.match(sql, /return query select false, null::uuid, 'this event is not eligible for reporting'/);

  assert.match(sql, /if v_recent_count >= 15 then/);
  assert.match(sql, /return query select false, null::uuid, 'daily report limit reached, try again tomorrow'/);
});

test('report_own_audit_event_issue never assigns a severity above warning and caps the note length', async () => {
  const sql = await read(issuePath);
  const reportFn = sql.slice(
    sql.indexOf('create or replace function public.report_own_audit_event_issue'),
    sql.indexOf('revoke all on function public.report_own_audit_event_issue'),
  );

  assert.match(reportFn, /v_note := left\(coalesce\(btrim\(p_note\), ''\), 240\)/);
  assert.match(reportFn, /'warning', 'reported',/);
  assert.match(reportFn, /now\(\), now\(\), 'unverified',/);

  // Neither the insert nor the update statement that actually writes a
  // control_room_issues row may assign a severity of error or critical, or
  // touch assignment/resolution fields -- they can only ever create/bump a
  // 'reported' status issue at 'warning' severity. (The function does read
  // v_event.severity against an eligibility allowlist that includes
  // 'critical', and reads a 'resolved'/'ignored' status filter -- both
  // expected and checked above; this assertion is scoped past those reads.)
  const insertStmt = reportFn.slice(reportFn.indexOf('insert into public.control_room_issues'), reportFn.indexOf('returning id into v_issue_id'));
  const updateStmt = reportFn.slice(reportFn.indexOf('update public.control_room_issues'), reportFn.indexOf('where id = v_issue_id'));

  for (const writeStmt of [insertStmt, updateStmt]) {
    assert.doesNotMatch(writeStmt, /'critical'/);
    assert.doesNotMatch(writeStmt, /assigned_to/);
    assert.doesNotMatch(writeStmt, /resolved/);
  }
});

test('report_own_audit_event_issue explicitly revokes the Supabase default anon auto-grant', async () => {
  const sql = await read(issuePath);

  assert.match(sql, /revoke all on function public\.report_own_audit_event_issue\(uuid, text\) from public/);
  assert.match(sql, /revoke all on function public\.report_own_audit_event_issue\(uuid, text\) from anon/);
  assert.match(sql, /grant execute on function public\.report_own_audit_event_issue\(uuid, text\) to authenticated, service_role/);
});
