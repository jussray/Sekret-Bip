import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const linkSrc = fs.readFileSync(new URL('../src/utils/parentLink.ts', import.meta.url), 'utf8');
const reconcileSql = fs.readFileSync(new URL('../supabase/migrations/20260630022018_limited_mode_parent_invite_transition.sql', import.meta.url), 'utf8');
const lockSql = fs.readFileSync(new URL('../supabase/migrations/20260711070000_lock_parent_links_to_rpc_only.sql', import.meta.url), 'utf8');
const revokeEdgeSrc = fs.readFileSync(new URL('../supabase/functions/parent-link-revoke/index.ts', import.meta.url), 'utf8');

test('invite creation uses the protected RPC', () => {
  assert.match(linkSrc, /\.rpc\('create_parent_link_invite'\)/);
  assert.doesNotMatch(linkSrc, /Math\.random/);
});

test('invite creation produces an eight-character uppercase code', () => {
  assert.match(linkSrc, /PARENT_INVITE_CODE_LENGTH = 8/);
  assert.match(reconcileSql, /upper\(substr\(md5\(gen_random_uuid\(\)::text\), 1, 8\)\)/);
});

test('invite creation stores a pending link with a 48-hour expiry', () => {
  assert.match(reconcileSql, /'pending'/);
  assert.match(reconcileSql, /interval '48 hours'/);
});

test('invite creation moves verification to PENDING_PARENT', () => {
  assert.match(reconcileSql, /'PENDING_PARENT'/);
  assert.match(reconcileSql, /parent_invite_created/);
});

test('invite creation RPC is authenticated-only', () => {
  assert.match(reconcileSql, /revoke execute on function public\.create_parent_link_invite\(\) from public, anon/);
  assert.match(reconcileSql, /grant execute on function public\.create_parent_link_invite\(\) to authenticated/);
});

test('invite redemption uses the protected RPC', () => {
  assert.match(linkSrc, /\.rpc\('redeem_parent_link_invite'/);
  assert.match(linkSrc, /p_invite_code:\s*normalized/);
});

test('redemption requires a pending unexpired invite', () => {
  assert.match(reconcileSql, /v_link\.status <> 'pending'/);
  assert.match(reconcileSql, /v_link\.expires_at is null or v_link\.expires_at <= now\(\)/);
});

test('redemption activates the link and verifies the teen atomically', () => {
  assert.match(reconcileSql, /parent_user_id = v_parent_id/);
  assert.match(reconcileSql, /status = 'active'/);
  assert.match(reconcileSql, /verification_state = 'VERIFIED_TEEN'/);
  assert.match(reconcileSql, /parent_link_state = 'active'/);
  assert.match(reconcileSql, /for update/);
});

test('linked teen lookup reads only active links', () => {
  assert.match(linkSrc, /fetchLinkedTeenId[\s\S]*?\.eq\('status', 'active'\)[\s\S]*?\.eq\('is_active', true\)/s);
});

test('parent_links is read-only to app clients', () => {
  assert.match(lockSql, /revoke all on table public\.parent_links from anon, authenticated/);
  assert.match(lockSql, /grant select on table public\.parent_links to authenticated/);
  assert.match(lockSql, /drop policy if exists "parent_links_insert"/);
  assert.match(lockSql, /drop policy if exists "parent_links_update"/);
  assert.doesNotMatch(lockSql, /create policy "parent_links_insert"/);
  assert.doesNotMatch(lockSql, /create policy "parent_links_update"/);
});

test('linked users retain non-anonymous read access', () => {
  assert.match(lockSql, /create policy "parent_links_select"/);
  assert.match(lockSql, /to authenticated/);
  assert.match(lockSql, /public\.is_non_anonymous_user\(\)/);
  assert.match(lockSql, /auth\.uid\(\)\) = teen_user_id/);
  assert.match(lockSql, /auth\.uid\(\)\) = parent_user_id/);
});

test('revocation uses an authenticated RPC instead of a client-side table update', () => {
  assert.match(linkSrc, /revokeParentLink[\s\S]*?\.rpc\('revoke_parent_link'\)/s);
  assert.doesNotMatch(linkSrc, /revokeParentLink[\s\S]*?\.from\('parent_links'\)/s);
  assert.match(lockSql, /revoke_parent_link\(p_link_id uuid default null\)/);
  assert.match(lockSql, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(lockSql, /auth\.jwt\(\) ->> 'is_anonymous'/);
  assert.match(lockSql, /teen_user_id = v_user_id or parent_user_id = v_user_id/);
  assert.match(lockSql, /p_link_id is null or id = p_link_id/);
  assert.match(lockSql, /status in \('pending', 'active'\)/);
  assert.match(lockSql, /status = 'revoked'/);
  assert.match(lockSql, /is_active = false/);
  assert.match(lockSql, /verification_state = 'PENDING_PARENT'/);
  assert.match(lockSql, /parent_link_state = 'revoked'/);
});

test('revocation RPC is authenticated-only', () => {
  assert.match(lockSql, /revoke execute on function public\.revoke_parent_link\(uuid\) from public, anon/);
  assert.match(lockSql, /grant execute on function public\.revoke_parent_link\(uuid\) to authenticated, service_role/);
});

test('parent-link-revoke edge function calls the RPC and never updates the table directly', () => {
  assert.match(revokeEdgeSrc, /db\.rpc\("revoke_parent_link",\s*\{\s*p_link_id: linkId/);
  assert.doesNotMatch(revokeEdgeSrc, /\.from\(["']parent_links["']\)/);
  assert.match(revokeEdgeSrc, /db\.auth\.getUser\(\)/);
  assert.match(revokeEdgeSrc, /invalid_link_id/);
});

test('link helpers return actionable failures without Supabase or auth', () => {
  assert.match(linkSrc, /code: 'not_configured'/);
  assert.match(linkSrc, /code: 'not_authenticated'/);
  assert.match(linkSrc, /export async function generateInviteCode\(\): Promise<string \| null>/);
  assert.match(linkSrc, /export async function redeemInviteCode\(code: string\): Promise<string \| null>/);
});
