import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260925070000_block_open_bip_author.sql');
const repository = read('src/features/circle/circleRepository.ts');
const screen = read('app/(teen)/circle/feed-v2.tsx');

test('Open Bip blocking resolves private identity only inside Postgres', () => {
  assert.match(migration, /create or replace function public\.block_public_circle_author_from_post/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /select p\.user_id\s+into v_blocked\s+from public\.public_circle_posts p/i);
  assert.match(migration, /if v_blocked = v_user/i);
  assert.match(migration, /insert into public\.blocked_users \(user_id, blocked_id\)/i);
  assert.match(migration, /on conflict \(user_id, blocked_id\) do nothing/i);
  assert.match(migration, /revoke all on function public\.block_public_circle_author_from_post\(bigint\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.block_public_circle_author_from_post\(bigint\) to authenticated/i);

  assert.match(repository, /rpc\('block_public_circle_author_from_post'/);
  assert.doesNotMatch(repository, /blocked_id\s*:/);
  assert.doesNotMatch(screen, /blocked_id\s*:/);
});

test('canonical Open Bip feed removes blocked relationships below the UI boundary', () => {
  assert.match(migration, /create or replace function public\.get_public_circle_feed/);
  assert.match(migration, /from public\.blocked_users b/i);
  assert.match(migration, /b\.user_id = v_user and b\.blocked_id = p\.user_id/i);
  assert.match(migration, /b\.user_id = p\.user_id and b\.blocked_id = v_user/i);

  assert.match(screen, /Block account/);
  assert.match(screen, /blockPublicCircleAuthor\(item\.id\)/);
  assert.match(screen, /accessibilityLabel="Circle safety options"/);
  assert.match(screen, /setItems\(current => current\.filter\(post => post\.id !== itemId\)\)/);
});
