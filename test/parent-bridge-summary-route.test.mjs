import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile(new URL('../app/(parent)/bridge.tsx', import.meta.url), 'utf8');
const screen = await readFile(new URL('../src/features/bridge/ParentBridgeSummaryScreen.tsx', import.meta.url), 'utf8');

test('parent route uses summary screen only', () => {
  assert.match(route, /ParentBridgeSummaryScreen/);
  assert.doesNotMatch(route, /useLinkedBridge/);
  assert.doesNotMatch(route, /linkedTeen/);
});

test('summary screen keeps the privacy boundary', () => {
  assert.match(screen, /does not unlock journals, chats, mood history, media/);
  assert.match(screen, /ParentBridgeSummaryInbox/);
  assert.doesNotMatch(screen, /sharedJournal|sharedMoods|entry\.text/);
});
