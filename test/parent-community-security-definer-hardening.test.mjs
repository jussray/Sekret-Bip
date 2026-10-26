import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261026103000_harden_parent_community_security_definer_surface.sql');

test('Parent Community RLS helpers move out of the exposed public schema', () => {
  assert.match(migration, /create schema if not exists private/);
  assert.match(migration, /create or replace function private\.is_parent_community_circle_id\(p_circle_id uuid\)/);
  assert.match(migration, /create or replace function private\.is_parent_community_post_id\(p_post_id uuid\)/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /grant usage on schema private to authenticated/);
  assert.match(migration, /grant execute on function private\.is_parent_community_circle_id\(uuid\)[\s\S]*to authenticated/);
  assert.match(migration, /grant execute on function private\.is_parent_community_post_id\(uuid\)[\s\S]*to authenticated/);
});

test('restrictive Parent Community policies call only private classifiers', () => {
  for (const policy of [
    'parent_community_membership_rpc_only',
    'parent_community_posts_rpc_only',
    'parent_community_comments_rpc_only',
    'parent_community_reactions_rpc_only',
  ]) {
    assert.match(migration, new RegExp('create policy ' + policy));
  }
  assert.match(migration, /private\.is_parent_community_circle_id\(circle_id\)/);
  assert.match(migration, /private\.is_parent_community_post_id\(post_id\)/);
  assert.doesNotMatch(
    migration.slice(migration.indexOf('drop policy if exists parent_community_membership_rpc_only')),
    /public\.is_parent_community_(?:circle|post)_id/,
  );
});

test('legacy public classifier endpoints are revoked and removed', () => {
  assert.match(migration, /revoke all on function public\.is_parent_community_circle_id\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.is_parent_community_post_id\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /drop function if exists public\.is_parent_community_circle_id\(uuid\)/);
  assert.match(migration, /drop function if exists public\.is_parent_community_post_id\(uuid\)/);
});

test('all five public Parent Circle privileged RPCs pin an empty search path', () => {
  for (const signature of [
    'get_parent_community_feed\\(integer\\)',
    'create_parent_community_post\\(text, text\\)',
    'react_to_parent_community_post\\(uuid, text\\)',
    'reply_to_parent_community_post\\(uuid, text\\)',
    'report_parent_community_post\\(uuid, text\\)',
  ]) {
    assert.match(
      migration,
      new RegExp('alter function public\\.' + signature + "[\\s\\S]*set search_path = ''"),
    );
  }
});
