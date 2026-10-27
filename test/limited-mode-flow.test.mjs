import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('completed teen onboarding routes unverified accounts into limited mode', async () => {
  const source = await read('app/index.tsx');
  assert.match(source, /verificationState === 'VERIFIED_TEEN'/);
  assert.match(source, /\(auth\)\/limited-mode/);
});

test('limited mode keeps private tools open and social tools locked', async () => {
  const source = await read('app/(auth)/limited-mode.tsx');
  assert.match(source, /Pages/);
  assert.match(source, /Voice Bip/);
  assert.match(source, /Circle/);
  assert.match(source, /Crew/);
  assert.match(source, /Discovery/);
});

test('parent invite creation uses a protected server transition', async () => {
  const client = await read('src/utils/parentLink.ts');
  const migration = await read('supabase/migrations/20260630022018_limited_mode_parent_invite_transition.sql');
  assert.match(client, /rpc\('create_parent_link_invite'\)/);
  assert.match(migration, /'PENDING_PARENT'/);
  assert.match(migration, /grant execute on function public\.create_parent_link_invite\(\) to authenticated/);
});

test('circle crew and discovery are treated as verification-gated routes', async () => {
  const source = await read('app/_layout.tsx');
  assert.match(source, /'circle'/);
  assert.match(source, /'crew'/);
  assert.match(source, /'discover'/);
});
