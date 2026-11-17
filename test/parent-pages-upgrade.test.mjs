import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../screens/ParentPagesScreen.tsx', import.meta.url), 'utf8');

test('parent pages includes the six grown-up scrapbook sections', () => {
  for (const label of ['Letters', 'Bridge', 'Journal', 'Repair', 'Wins', 'Future']) {
    assert.match(source, new RegExp(label));
  }
});

test('parent pages preserves privacy language', () => {
  assert.match(source, /Private unless you choose to share later/);
  assert.match(source, /This stays on your side/);
});

test('parent pages stores section identity without adding a new data model', () => {
  assert.match(source, /moodTag: section/);
  assert.match(source, /source: section === 'bridge' \? 'bridge' : 'me'/);
});
