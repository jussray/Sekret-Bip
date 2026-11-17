import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('parent invite redemption uses the protected RPC', async () => {
  const source = await read('src/utils/parentLink.ts');
  assert.match(source, /rpc\('redeem_parent_link_invite'/);
  assert.doesNotMatch(source, /from\('account_verification'\).*update/s);
});

test('approval migration atomically activates the link and verifies the teen', async () => {
  const source = await read('supabase/migrations/20260630022018_limited_mode_parent_invite_transition.sql');
  assert.match(source, /status = 'active'/);
  assert.match(source, /'VERIFIED_TEEN'/);
  assert.match(source, /parent_link_state = 'active'/);
  assert.match(source, /security definer/);
  assert.match(source, /grant execute on function public\.redeem_parent_link_invite\(text\) to authenticated/);
});
