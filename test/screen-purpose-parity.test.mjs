import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('screen purpose registry covers both teen and parent primary surfaces', async () => {
  const source = await read('src/constants/screenPurpose.ts');

  for (const side of ["side: 'teen'", "side: 'parent'"]) {
    assert.match(source, new RegExp(side));
  }

  for (const purpose of [
    'Visual home base',
    'Journal and notebook hub',
    'Comfort tools',
    'Voice-first talk mode',
    'Teen community',
    'Feature drawer',
    'Private teen-to-parent connection',
  ]) {
    assert.match(source, new RegExp(purpose));
  }

  for (const parentPurpose of [
    'Parent home base',
    'Parent-owned notebook',
    'Pause-before-replying',
    'Parent-to-parent community',
    'Private parent-to-teen connection',
  ]) {
    assert.match(source, new RegExp(parentPurpose));
  }
});

test('teen More is grouped and no longer a flat feature list', async () => {
  const source = await read('screens/MoreScreen.tsx');
  assert.match(source, /TEEN_MORE_GROUPS/);
  assert.match(source, /FEATURE DRAWER/);
  assert.match(source, /Room, Pages, Calm, Voice Bip, and Circle keep their own jobs/);
});

test('parent More keeps Bridge connection tools separate from Parent Pages', async () => {
  const more = await read('app/(parent)/more.tsx');
  const purposes = await read('src/constants/screenPurpose.ts');

  assert.match(more, /PARENT_MORE_GROUPS/);
  assert.match(more, /Bridge carries Doorbell signals, S2Tell shares, and replies/);
  assert.match(more, /Support without surveillance/);

  assert.match(purposes, /title: 'Parent Pages'.*Parent-owned notebook and reflection hub/s);
  assert.match(purposes, /title: 'Parent Bridge'.*Private parent-to-teen connection and replies/s);
  assert.match(purposes, /label: 'Bridge'.*Doorbell signals, S2Tell shares, replies, and shared moments/s);
});

test('audit defines the same purpose discipline for both sides', async () => {
  const source = await read('docs/SCREEN_PURPOSE_AUDIT.md');
  assert.match(source, /### Teen side/);
  assert.match(source, /### Parent side/);
  assert.match(source, /A feature belongs on a screen only when it strengthens that screen’s single job/);
});
