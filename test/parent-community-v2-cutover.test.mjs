import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const enumMigration = read('supabase/migrations/20261025025400_parent_community_reaction_kind_values.sql');
const cutover = read('supabase/migrations/20261025025500_parent_community_v2_rpc_cutover.sql');
const repository = read('src/features/circle/parentCommunityRepository.ts');
const route = read('app/(parent)/circle/feed.tsx');
const detail = read('app/(parent)/circle/[id].tsx');
const screen = read('screens/ParentCircleScreen.tsx');
const legacySync = read('src/utils/sync.ts');
const sharedTypes = read('src/types/index.ts');

function functionBlock(sql, name, nextName) {
  const start = sql.indexOf('create or replace function public.' + name);
  assert.notEqual(start, -1, 'missing function ' + name);
  const end = nextName
    ? sql.indexOf('create or replace function public.' + nextName, start + 1)
    : sql.indexOf('revoke all on function', start + 1);
  return sql.slice(start, end === -1 ? sql.length : end);
}

test('hidden V2 interaction baseline is reconciled without replacing production objects', () => {
  assert.match(enumMigration, /if not exists \([\s\S]*t\.typname = 'reaction_kind'[\s\S]*create type public\.reaction_kind as enum/i);
  for (const reaction of ['felt', 'comfort', 'proud', 'stay', 'beenThere', 'solidarity', 'reminder', 'needed', 'strength']) {
    assert.match(enumMigration, new RegExp("alter type public\\.reaction_kind add value if not exists '" + reaction + "'"));
  }
  assert.match(enumMigration, /if to_regclass\('public\.post_reactions'\) is null then/i);
  assert.match(enumMigration, /if to_regclass\('public\.post_comments'\) is null then/i);
  assert.match(enumMigration, /revoke all on table public\.post_reactions from anon, authenticated/i);
  assert.match(enumMigration, /revoke all on table public\.post_comments from anon, authenticated/i);
});

test('guardian verification requires a permanent account before verified-guardian state', () => {
  const fn = functionBlock(cutover, 'is_verified_guardian', 'get_parent_community_feed');
  assert.match(fn, /public\.is_non_anonymous_user\(\)/);
  assert.match(fn, /verification_state = 'VERIFIED_GUARDIAN'/);
  assert.match(fn, /cp\.account_type = 'guardian'/);
});

test('cross-parent Parent Community raw rows are not exposed through circles or posts policies', () => {
  const circlesPolicy = cutover.slice(
    cutover.indexOf('create policy "circles select owner or member"'),
    cutover.indexOf('drop policy if exists "circles insert own"'),
  );
  const postsPolicy = cutover.slice(
    cutover.indexOf('create policy "posts select by circle visibility"'),
    cutover.indexOf('drop policy if exists "posts insert by author"'),
  );
  assert.doesNotMatch(circlesPolicy, /parent_community/);
  assert.doesNotMatch(postsPolicy, /parent_community/);
  assert.match(circlesPolicy, /public\.is_non_anonymous_user\(\)/);
  assert.match(postsPolicy, /public\.is_non_anonymous_user\(\)/);
});

test('redacted feed RPC returns no author identity or reply body', () => {
  const fn = functionBlock(cutover, 'get_parent_community_feed', 'create_parent_community_post');
  assert.match(fn, /verified_guardian_required/);
  assert.match(fn, /reaction_counts jsonb/);
  assert.match(fn, /quiet_reply_count bigint/);
  assert.doesNotMatch(fn, /author_user_id/);
  assert.doesNotMatch(fn, /pc\.body/);
});

test('all Parent Community mutation RPCs verify permanent guardian authority', () => {
  for (const [name, next] of [
    ['create_parent_community_post', 'react_to_parent_community_post'],
    ['react_to_parent_community_post', 'reply_to_parent_community_post'],
    ['reply_to_parent_community_post', 'report_parent_community_post'],
  ]) {
    const fn = functionBlock(cutover, name, next);
    assert.match(fn, /authentication_required/);
    assert.match(fn, /permanent_account_required/);
    assert.match(fn, /verified_guardian_required/);
  }
  const reportFn = functionBlock(cutover, 'report_parent_community_post');
  assert.match(reportFn, /authentication_required/);
  assert.match(reportFn, /permanent_account_required/);
  assert.match(reportFn, /verified_guardian_required/);
});

test('SECURITY DEFINER Parent Community RPCs are not executable by PUBLIC or anon', () => {
  for (const signature of [
    'get_parent_community_feed(integer)',
    'create_parent_community_post(text, text)',
    'react_to_parent_community_post(uuid, text)',
    'reply_to_parent_community_post(uuid, text)',
    'report_parent_community_post(uuid, text)',
  ]) {
    assert.match(cutover, new RegExp('revoke all on function public\\.' + signature.replace(/[()]/g, '\\$&') + ' from public, anon'));
    assert.match(cutover, new RegExp('grant execute on function public\\.' + signature.replace(/[()]/g, '\\$&') + ' to authenticated'));
  }
});

test('moderation carrier preserves legacy IDs and accepts V2 UUID strings', () => {
  assert.match(cutover, /alter column post_id type text/);
  assert.match(cutover, /using post_id::text/);
  const reportFn = functionBlock(cutover, 'report_parent_community_post');
  assert.match(reportFn, /p_post_id::text/);
  assert.match(reportFn, /post_type,[\s\S]*'parent'/);
});

test('client repository uses only redacted Parent Community RPCs', () => {
  for (const rpc of [
    'get_parent_community_feed',
    'create_parent_community_post',
    'react_to_parent_community_post',
    'reply_to_parent_community_post',
    'report_parent_community_post',
  ]) {
    assert.match(repository, new RegExp("rpc\\('" + rpc + "'"));
  }
  assert.doesNotMatch(repository, /\.from\('posts'\)/);
  assert.doesNotMatch(repository, /\.from\('circles'\)/);
  assert.doesNotMatch(repository, /\.from\('post_comments'\)/);
  assert.doesNotMatch(repository, /\.from\('post_reactions'\)/);
  assert.doesNotMatch(repository, /author_user_id/);
});

test('active Parent Circle route replaces legacy self-history with V2 community data', () => {
  assert.match(route, /loadParentCommunityFeed/);
  assert.match(route, /createParentCommunityPost/);
  assert.match(route, /reactToParentCommunityPost/);
  assert.match(route, /reportParentCommunityPost/);
  assert.doesNotMatch(route, /loadParentCircleFeed/);
  assert.doesNotMatch(route, /syncParentCirclePost/);
  assert.doesNotMatch(route, /console\.(?:log|info|warn|error|debug)/);
  assert.match(route, /setParentCirclePosts\(cloud\)/);
});

test('Parent Circle UI is UUID-safe and preview samples never masquerade as production community posts', () => {
  assert.match(sharedTypes, /export interface ParentCirclePost \{[\s\S]*?id: string \| number;/);
  assert.match(sharedTypes, /quietRepliesCount\?: number;/);
  assert.doesNotMatch(route, /Number\(id\)/);
  assert.doesNotMatch(detail, /Number\(post/);
  assert.match(detail, /replyToParentCommunityPost\(String\(post!\.id\), text\)/);
  assert.match(screen, /__DEV__ \? SEED_POSTS : \[\]/);
  assert.match(detail, /__DEV__ \? SEED_POSTS : \[\]/);
  assert.match(screen, /Preview posts below are local samples only\. Nothing is uploaded\./);
  assert.doesNotMatch(screen, /For You/);
  assert.doesNotMatch(screen, /Following/);
});

test('legacy Parent Circle sync remains available only as rollback compatibility', () => {
  assert.match(legacySync, /export function syncParentCirclePost/);
  assert.match(legacySync, /export async function loadParentCircleFeed/);
});
