import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselinePath = path.join(root, 'supabase', 'migrations', '0002_circle_v1.sql');
const hardeningPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260811134000_harden_circle_friendships_write_path.sql',
);

const baseline = fs.readFileSync(baselinePath, 'utf8');
const hardening = fs.readFileSync(hardeningPath, 'utf8');

test('legacy friends-only reads trust accepted friendship rows', () => {
  assert.match(
    baseline,
    /create policy "circle_profiles_friends_read"[\s\S]*circle_friendships[\s\S]*status = 'accepted'/i,
  );
  assert.match(
    baseline,
    /create policy "fcp_friends_read"[\s\S]*circle_friendships[\s\S]*status = 'accepted'/i,
  );
});

test('friendship hardening is safe when the legacy table is absent', () => {
  assert.match(hardening, /to_regclass\('public\.circle_friendships'\) is null/i);
  assert.match(hardening, /return;/i);
});

test('authenticated clients can inspect their friendship rows but cannot forge them', () => {
  assert.match(hardening, /drop policy if exists "cf_self" on public\.circle_friendships/i);
  assert.match(
    hardening,
    /create policy "cf_self"[\s\S]*on public\.circle_friendships[\s\S]*for select[\s\S]*to authenticated/i,
  );
  assert.match(hardening, /public\.is_non_anonymous_user\(\)/i);
  assert.match(hardening, /auth\.uid\(\) = user_id or auth\.uid\(\) = friend_id/i);
  assert.match(
    hardening,
    /revoke insert, update, delete on table public\.circle_friendships from anon, authenticated/i,
  );
  assert.match(hardening, /grant select on table public\.circle_friendships to authenticated/i);
  assert.doesNotMatch(hardening, /grant\s+(insert|update|delete)/i);
});

test('untrusted accepted friendship rows no longer authorize cross-user reads', () => {
  assert.match(
    hardening,
    /drop policy if exists "circle_profiles_friends_read" on public\.circle_profiles/i,
  );
  assert.match(
    hardening,
    /drop policy if exists "fcp_friends_read" on public\.friends_circle_posts/i,
  );
  assert.doesNotMatch(
    hardening,
    /create policy "circle_profiles_friends_read"/i,
  );
  assert.doesNotMatch(
    hardening,
    /create policy "fcp_friends_read"/i,
  );
});

test('hardening remains transactional', () => {
  assert.match(hardening, /^begin;/im);
  assert.match(hardening, /commit;\s*$/i);
});
