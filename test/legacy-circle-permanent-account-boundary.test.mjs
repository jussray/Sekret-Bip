import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260827062000_harden_legacy_circle_permanent_account_boundaries.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');
const readLegacySync = () => readFile(new URL('../src/utils/sync.ts', import.meta.url), 'utf8');
const readModeration = () => readFile(new URL('../src/utils/circleModeration.ts', import.meta.url), 'utf8');

const permanentTables = [
  'friends_circle_posts',
  'crew_circle_posts',
  'parent_circle_posts',
  'circle_comments',
  'blocked_users',
  'reported_posts',
];

test('legacy Circle tables have restrictive permanent-account policies', async () => {
  const sql = await readMigration();

  for (const table of permanentTables) {
    assert.match(
      sql,
      new RegExp(`create policy ${table}_permanent_accounts_only[\\s\\S]*?on public\\.${table}[\\s\\S]*?as restrictive[\\s\\S]*?public\\.is_non_anonymous_user\\(\\)`, 'i'),
      `${table} must deny anonymous-authenticated sessions independently of permissive owner/audience policies`,
    );
  }
});

test('parent community legacy table additionally requires verified guardian authority', async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /create policy parent_circle_posts_verified_guardians_only[\s\S]*?as restrictive[\s\S]*?public\.is_verified_guardian\(\)/i,
  );
});

test('dormant polymorphic comments fail closed instead of reading across every Circle audience', async () => {
  const sql = await readMigration();

  assert.match(sql, /drop policy if exists cc_read on public\.circle_comments/i);
  assert.match(sql, /circle_comments_permanent_accounts_only/);
  assert.doesNotMatch(sql, /create policy cc_read/i);
});

test('legacy Circle client roles lose broad table privileges and regain only required CRUD', async () => {
  const sql = await readMigration();

  for (const table of permanentTables) {
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from authenticated`, 'i'));
  }

  assert.doesNotMatch(sql, /grant\s+(?:all|truncate|references|trigger)\b/i);
  assert.match(sql, /grant select, insert, update, delete\s+on table public\.friends_circle_posts to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete\s+on table public\.crew_circle_posts to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete\s+on table public\.parent_circle_posts to authenticated/i);
  assert.match(sql, /grant select, insert, update, delete\s+on table public\.circle_comments to authenticated/i);
  assert.match(sql, /grant select, insert, delete on table public\.blocked_users to authenticated/i);
  assert.match(sql, /grant select, insert, delete on table public\.reported_posts to authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*update[^;]*on table public\.(?:blocked_users|reported_posts)/i);
});

test('serial sequences are not usable by anon after hardening', async () => {
  const sql = await readMigration();

  for (const sequence of [
    'friends_circle_posts_id_seq',
    'crew_circle_posts_id_seq',
    'circle_comments_id_seq',
    'blocked_users_id_seq',
    'reported_posts_id_seq',
  ]) {
    assert.match(
      sql,
      new RegExp(`revoke all on sequence public\\.${sequence} from anon, authenticated`, 'i'),
    );
    assert.match(
      sql,
      new RegExp(`grant usage, select on sequence public\\.${sequence} to authenticated`, 'i'),
    );
  }
});

test('migration covers the legacy direct-write compatibility paths still present in source', async () => {
  const [sync, moderation, sql] = await Promise.all([
    readLegacySync(),
    readModeration(),
    readMigration(),
  ]);

  assert.match(sync, /friends:\s*TABLES\.friendsCirclePosts/);
  assert.match(sync, /crew:\s*TABLES\.crewCirclePosts/);
  assert.match(sync, /parent:\s*TABLES\.parentCirclePosts/);
  assert.match(sync, /syncParentCirclePost/);
  assert.match(moderation, /\.from\('reported_posts'\)\.insert/);
  assert.doesNotMatch(moderation, /\.from\('blocked_users'\)/);

  assert.match(sql, /friends_circle_posts_permanent_accounts_only/);
  assert.match(sql, /crew_circle_posts_permanent_accounts_only/);
  assert.match(sql, /parent_circle_posts_permanent_accounts_only/);
  assert.match(sql, /reported_posts_permanent_accounts_only/);
});