import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const baseline = read('supabase/migrations/20261025025400_parent_community_reaction_kind_values.sql');
const cutover = read('supabase/migrations/20261025025500_parent_community_v2_rpc_cutover.sql');

function functionBlock(sql, name, nextName) {
  const marker = 'create or replace function public.' + name;
  const start = sql.indexOf(marker);
  assert.notEqual(start, -1, 'missing function ' + name);
  const next = nextName ? sql.indexOf('create or replace function public.' + nextName, start + marker.length) : -1;
  const grants = sql.indexOf('\nrevoke all on function', start + marker.length);
  const ends = [next, grants].filter(value => value !== -1);
  const end = ends.length ? Math.min(...ends) : sql.length;
  return sql.slice(start, end);
}

test('Main Bip is declared as the canonical Parent Circle backend owner', () => {
  assert.match(cutover, /Authority: jussray\/Sekret-Bip is the canonical Bip backend\/schema owner/);
  assert.match(cutover, /Specialized Bip repos consume these contracts/);
  assert.match(cutover, /Production application remains a separate founder gate/);
});

test('hidden interaction baseline is additive and preserves existing production objects', () => {
  assert.match(baseline, /t\.typname = 'reaction_kind'[\s\S]*create type public\.reaction_kind as enum/i);
  for (const reaction of ['beenThere', 'solidarity', 'reminder', 'needed', 'strength']) {
    assert.match(baseline, new RegExp("alter type public\\.reaction_kind add value if not exists '" + reaction + "'"));
  }
  assert.match(baseline, /if to_regclass\('public\.post_reactions'\) is null then/i);
  assert.match(baseline, /if to_regclass\('public\.post_comments'\) is null then/i);
});

test('verified guardian authority includes the permanent-account boundary', () => {
  const fn = functionBlock(cutover, 'is_verified_guardian', 'is_parent_community_circle_id');
  assert.match(fn, /public\.is_non_anonymous_user\(\)/);
  assert.match(fn, /verification_state = 'VERIFIED_GUARDIAN'/);
  assert.match(fn, /cp\.account_type = 'guardian'/);
});

test('raw Parent Community tables are protected by restrictive RPC-only membranes', () => {
  for (const [policy, table] of [
    ['parent_community_circles_rpc_only', 'circles'],
    ['parent_community_membership_rpc_only', 'circle_members'],
    ['parent_community_posts_rpc_only', 'posts'],
    ['parent_community_comments_rpc_only', 'post_comments'],
    ['parent_community_reactions_rpc_only', 'post_reactions'],
    ['parent_community_reports_rpc_only', 'reported_posts'],
  ]) {
    const pattern = new RegExp(
      'create policy ' + policy + '[\\s\\S]*on public\\.' + table + '[\\s\\S]*as restrictive[\\s\\S]*to authenticated',
      'i',
    );
    assert.match(cutover, pattern, policy);
  }
  assert.match(cutover, /not public\.is_parent_community_circle_id\(circle_id\)/);
  assert.match(cutover, /not public\.is_parent_community_post_id\(post_id\)/);
  assert.match(cutover, /kind <> 'parent_community'::public\.circle_kind/);
});

test('RLS classification helpers bypass raw-row visibility without exposing row content', () => {
  for (const helper of ['is_parent_community_circle_id', 'is_parent_community_post_id']) {
    const fn = functionBlock(cutover, helper);
    assert.match(fn, /returns boolean/i);
    assert.match(fn, /security definer/i);
    assert.match(fn, /set row_security = off/i);
    assert.doesNotMatch(fn, /returns table|author_user_id|body text/i);
    assert.match(cutover, new RegExp('revoke all on function public\\.' + helper + '\\(uuid\\) from public, anon;'));
    assert.match(cutover, new RegExp('grant execute on function public\\.' + helper + '\\(uuid\\) to authenticated;'));
  }
});

test('redacted feed exposes no guardian identity or quiet-reply body', () => {
  const fn = functionBlock(cutover, 'get_parent_community_feed', 'create_parent_community_post');
  assert.match(fn, /reaction_counts jsonb/);
  assert.match(fn, /quiet_reply_count bigint/);
  assert.doesNotMatch(fn, /author_user_id/);
  assert.doesNotMatch(fn, /pc\.body/);
});

test('every Parent Community mutation RPC checks authenticated permanent verified-guardian authority', () => {
  for (const [name, next] of [
    ['create_parent_community_post', 'react_to_parent_community_post'],
    ['react_to_parent_community_post', 'reply_to_parent_community_post'],
    ['reply_to_parent_community_post', 'report_parent_community_post'],
    ['report_parent_community_post', null],
  ]) {
    const fn = functionBlock(cutover, name, next);
    assert.match(fn, /authentication_required/);
    assert.match(fn, /permanent_account_required/);
    assert.match(fn, /verified_guardian_required/);
  }
});

test('RPC execution is authenticated-only and raw legacy report compatibility is preserved', () => {
  for (const signature of [
    'get_parent_community_feed(integer)',
    'create_parent_community_post(text, text)',
    'react_to_parent_community_post(uuid, text)',
    'reply_to_parent_community_post(uuid, text)',
    'report_parent_community_post(uuid, text)',
  ]) {
    assert.ok(cutover.includes('revoke all on function public.' + signature + ' from public, anon;'));
    assert.ok(cutover.includes('grant execute on function public.' + signature + ' to authenticated;'));
  }
  assert.match(cutover, /alter column post_id type text[\s\S]*using post_id::text/);
  assert.match(cutover, /post_type = 'parent'[\s\S]*post_id ~\*/);
  assert.match(cutover, /p_post_id::text/);
});

test('backend cutover test is intentionally independent of parent UI files', () => {
  assert.doesNotMatch(import.meta.url, /Sekret-Bip-Parents/);
  assert.doesNotMatch(cutover, /screens\/|app\/\(parent\)|ParentCircleScreen/);
});
