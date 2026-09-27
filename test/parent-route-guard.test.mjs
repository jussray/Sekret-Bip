import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const layout = fs.readFileSync(new URL('../app/(parent)/_layout.tsx', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');

test('parent route group resolves backend state before rendering tabs', () => {
  assert.match(layout, /resolveParentEntryState\(\)/);
  assert.match(layout, /entryState\.state !== 'ready'/);
  assert.match(layout, /<Redirect href=\{routeForParentEntryState\(entryState\)/);
  assert.doesNotMatch(layout, /AsyncStorage/);
});

test('root parent routing delegates to the same backend state resolver', () => {
  assert.match(index, /accountProfile\.accountSide === 'parent'/);
  assert.match(index, /const parentEntry = await resolveParentEntryState\(\)/);
  assert.match(index, /routeForParentEntryState\(parentEntry\)/);
  assert.doesNotMatch(index, /parent_profile_done/);
  assert.doesNotMatch(index, /linked_teen_id/);
});

test('route resolution errors render retry UI instead of granting access', () => {
  assert.match(layout, /We could not verify Parent Side\./);
  assert.match(layout, /setAttempt\(value => value \+ 1\)/);
  assert.match(index, /Unable to verify Parent Side access\./);
});
