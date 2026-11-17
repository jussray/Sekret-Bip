import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('parent doorbell reads only approved Bridge metadata', async () => {
  const source = await read('src/features/parent/useParentDoorbell.ts');
  assert.match(source, /from\('bridge_signals'\)/);
  assert.match(source, /id,share_type,char_key,conv_mode,sent_at/);
  assert.doesNotMatch(source, /journal_entries|voice_notes|message_text|content/);
});

test('parent dashboard is a redirect alias into Bridge signals tab', async () => {
  // app/(parent)/dashboard.tsx was converted from a full dashboard screen
  // to a thin Redirect alias pointing at the Bridge signals tab.
  // Privacy copy now lives in the Bridge screen itself.
  const source = await read('app/(parent)/dashboard.tsx');
  assert.match(source, /\(parent\)\/bridge\?tab=signals/);
});

test('parent more screen links to Bridge as the connection hub', async () => {
  // The More screen routes Bridge via routeForSide('parent', 'parent-bridge').
  // PARENT_MORE_GROUPS in screenPurpose.ts defines the Bridge item with
  // route: 'parent-bridge' and a description mentioning Doorbell signals.
  const source = await read('app/(parent)/more.tsx');
  assert.match(source, /Doorbell signals/);
  assert.match(source, /Bridge carries/);
  // The more screen subtitle names all three Bridge connection types.
  assert.match(source, /S2Tell/);
});
