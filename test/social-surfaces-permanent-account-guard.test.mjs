import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20261006020000_social_surfaces_permanent_accounts_only.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');

const SOCIAL_SURFACES = [
  'friendships', 'circles', 'circle_members', 'circle_posts', 'posts', 'post_comments', 'post_reactions',
  'crews', 'crew_check_ins', 'crew_check_in_shares', 'crew_encouragements', 'scrapbook_entries',
  'parent_mood_summaries', 'parent_notes',
];

function guardedTables(sql) {
  const list = sql.match(/foreach t in array array\[([\s\S]*?)\]/);
  assert.ok(list, 'migration must declare the guarded table list');
  return [...list[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

test('every social, Circle, Crew and parent surface gets the permanent-account guard', async () => {
  const tables = guardedTables(await readMigration());
  for (const t of SOCIAL_SURFACES) assert.ok(tables.includes(t), `${t} must reject anonymous sessions`);
});

test('the guard is RESTRICTIVE, targets authenticated, and checks both read and write', async () => {
  const sql = await readMigration();
  assert.match(sql, /as restrictive for all to authenticated/);
  const anonCheck = /coalesce\(\(\(select auth\.jwt\(\)\) ->> ''is_anonymous''\)::boolean, false\) is false/g;
  assert.equal(sql.match(anonCheck)?.length, 2, 'USING and WITH CHECK must both reject anonymous sessions');
  assert.match(sql, /'using \(coalesce/);
  assert.match(sql, /'with check \(coalesce/);
});

test('existing access rules, grants and data are untouched; replay-safe on absent tables', async () => {
  const sql = await readMigration();
  const code = sql.replace(/^--.*$/gm, '');
  assert.match(code, /if to_regclass\('public\.' \|\| t\) is not null then/);
  assert.doesNotMatch(code, /\bas permissive\b/i, 'must not add permissive policies');
  assert.doesNotMatch(code, /\balter policy\b/i, 'must not rewrite existing policies');
  assert.doesNotMatch(code, /\b(grant|revoke)\b/i, 'must not change grants');
  assert.doesNotMatch(code, /\b(delete from|update public\.|insert into|truncate|drop table)\b/i, 'must not touch data');
  assert.match(code, /drop policy if exists %I on public\.%I', t \|\| '_permanent_accounts_only'/, 'idempotent re-run');
});

test('the guard mirrors the circle_reactions precedent already live in production', async () => {
  const sql = await readMigration();
  assert.match(sql, /_permanent_accounts_only/);
  assert.match(sql, /circle_reactions_permanent_accounts_only/);
});
