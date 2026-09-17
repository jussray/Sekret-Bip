import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Room keeps cinematic hotspots but exposes an explicit shortcut guide', async () => {
  const teenRoom = await read('app/(teen)/room.tsx');
  const parentRoom = await read('app/(parent)/room.tsx');
  const guide = await read('components/rooms/RoomExploreGuide.tsx');

  assert.match(teenRoom, /RoomExploreGuide side="teen"/);
  assert.match(parentRoom, /RoomExploreGuide side="parent"/);
  assert.match(guide, /What can I tap\?/);
  assert.match(guide, /Room shortcuts/);
  assert.match(guide, /Tap objects in the room, or use a shortcut here\./);
  assert.match(guide, /accessibilityLabel=\{open \? 'Hide room shortcuts' : 'Show room shortcuts'\}/);
});

test('More does not duplicate destinations already owned by primary navigation or Bippin 2', async () => {
  const purposes = await read('src/constants/screenPurpose.ts');
  const teenDrawer = purposes.slice(
    purposes.indexOf('export const TEEN_MORE_GROUPS'),
    purposes.indexOf('export const PARENT_MORE_GROUPS'),
  );
  const parentDrawer = purposes.slice(purposes.indexOf('export const PARENT_MORE_GROUPS'));

  assert.doesNotMatch(teenDrawer, /label: 'Bip Points'/);
  assert.doesNotMatch(parentDrawer, /label: 'Bridge'/);
  assert.doesNotMatch(parentDrawer, /label: 'Parent Circle'/);
  assert.match(teenDrawer, /label: 'Bippin 2'.*points/s);
});

test('first-run age setup uses person-facing language instead of implementation jargon', async () => {
  const welcome = await read('app/(onboarding)/welcome.tsx');
  const visibleCopy = welcome.slice(welcome.indexOf('return ('), welcome.indexOf('const styles'));

  assert.match(visibleCopy, /Find your/);
  assert.match(visibleCopy, /right Bip space/);
  assert.match(visibleCopy, /Choose your age range/);
  assert.match(visibleCopy, /We do not ask for a raw ID, selfie, video, or full birth date here\./);
  assert.doesNotMatch(visibleCopy, /age bucket/i);
  assert.doesNotMatch(visibleCopy, /assurance status/i);
  assert.doesNotMatch(visibleCopy, /account side/i);
});
