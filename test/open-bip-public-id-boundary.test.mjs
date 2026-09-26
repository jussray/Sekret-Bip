import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260826012500_pseudonymize_open_bip_author_ids.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');
const readCircleV1 = () => readFile(new URL('../supabase/migrations/0002_circle_v1.sql', import.meta.url), 'utf8');
const readRepository = () => readFile(new URL('../src/features/circle/circleRepository.ts', import.meta.url), 'utf8');

test('Circle profiles receive a random stable public id separate from auth user id', async () => {
  const sql = await readMigration();

  assert.match(sql, /add column if not exists public_id uuid/);
  assert.match(sql, /set public_id = gen_random_uuid\(\)/);
  assert.match(sql, /alter column public_id set default gen_random_uuid\(\)/);
  assert.match(sql, /create unique index if not exists circle_profiles_public_id_uidx/);
});

test('relationship profile reads cannot expose the public id alongside auth-backed user ids', async () => {
  const [sql, circleV1] = await Promise.all([readMigration(), readCircleV1()]);
  const start = sql.indexOf('revoke all on table public.circle_profiles');
  const end = sql.indexOf('-- Preserve the existing RPC shape', start);
  const grants = sql.slice(start, end);

  assert.match(
    circleV1,
    /create policy "circle_profiles_friends_read" on public\.circle_profiles/,
    'legacy Friends visibility exists, so column privileges must carry the pseudonym privacy boundary',
  );
  assert.match(sql, /revoke all on table public\.circle_profiles from public, anon, authenticated/);
  assert.match(
    grants,
    /grant select \(user_id, nickname, avatar_emoji, account_type, created_at, updated_at\)\s+on table public\.circle_profiles to authenticated/,
  );
  assert.doesNotMatch(
    grants,
    /grant\s+select\s+on\s+table\s+public\.circle_profiles/iu,
    'authenticated must not regain table-level SELECT across public_id',
  );
  assert.doesNotMatch(
    grants,
    /grant\s+select\s*\([^)]*\bpublic_id\b[^)]*\)/iu,
    'public_id must remain unreadable through direct authenticated table access',
  );
});

test('public Circle ids are database-owned while existing profile upserts keep their write columns', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('revoke all on table public.circle_profiles');
  const end = sql.indexOf('-- Preserve the existing RPC shape', start);
  const grants = sql.slice(start, end);

  assert.match(
    grants,
    /grant insert \(user_id, nickname, avatar_emoji, account_type, updated_at\)\s+on table public\.circle_profiles to authenticated/,
  );
  assert.match(
    grants,
    /grant update \(user_id, nickname, avatar_emoji, account_type, updated_at\)\s+on table public\.circle_profiles to authenticated/,
  );
  assert.doesNotMatch(
    grants,
    /grant\s+(?=[^;\n]*(?:insert|update))[^();\n]+\s+on\s+table\s+public\.circle_profiles/iu,
    'authenticated must not regain table-level INSERT or UPDATE on circle_profiles',
  );
  assert.doesNotMatch(
    grants,
    /grant\s+(?:insert|update)\s*\([^)]*\bpublic_id\b[^)]*\)/iu,
    'public_id must never be client-writable',
  );
});

test('Open Bip feed returns the public profile id instead of public_circle_posts.user_id', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('create or replace function public.get_public_circle_feed');
  const end = sql.indexOf('create or replace function public.create_public_circle_post', start);
  const body = sql.slice(start, end);

  assert.match(body, /left join public\.circle_profiles cp\s+on cp\.user_id = p\.user_id/);
  assert.match(body, /select\s+p\.id,\s+cp\.public_id,/s);
  assert.doesNotMatch(body, /select\s+p\.id,\s+p\.user_id,/s);
  assert.match(body, /p\.user_id = v_user/);
});

test('new Open Bip posts expose only the random public id to the caller', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('create or replace function public.create_public_circle_post');
  const end = sql.indexOf('-- The compatibility profile RPC', start);
  const body = sql.slice(start, end);

  assert.match(body, /select cp\.public_id\s+into v_public_id/);
  assert.match(body, /raise exception 'circle_profile_required'/);
  assert.match(body, /select\s+v_post\.id,\s+v_public_id,/s);
  assert.doesNotMatch(body, /select\s+v_post\.id,\s+v_post\.user_id,/s);
});

test('profile lookup accepts only public ids and never returns private auth ids', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('create or replace function public.get_public_circle_profiles');
  const end = sql.indexOf('\nrevoke all on function', start);
  const body = sql.slice(start, end);

  assert.match(body, /select cp\.public_id, cp\.nickname, cp\.avatar_emoji/);
  assert.match(body, /where cp\.public_id = any/);
  assert.doesNotMatch(body, /select cp\.user_id, cp\.nickname/);
  assert.doesNotMatch(body, /where cp\.user_id = any/);
});

test('existing client compatibility flow still resolves feed author ids through the profile RPC', async () => {
  const source = await readRepository();

  assert.match(source, /author_user_id: string/);
  assert.match(source, /loadProfileMap\(rows\.map\(row => row\.author_user_id\)\)/);
  assert.match(source, /supabase\.rpc\('get_public_circle_profiles'/);
});
