import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/utils/storage.ts', import.meta.url), 'utf8');
const jsonKeysBlock = source.match(/const JSON_KEYS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';

const required = [
  ['parentProfileData', 'parent_profile_data'],
  ['parentProfileDone', 'parent_profile_done'],
  ['linkedTeenId', 'linked_teen_id'],
  ['devTestFamilyV1', 'dev_test_family_v1'],
];

test('parent entry cache keys are canonical storage keys and private-account data', () => {
  for (const [property, value] of required) {
    assert.match(source, new RegExp(`${property}: '${value}'`));
    assert.match(source, new RegExp(`STORAGE_KEYS\\.${property}`));
  }
});

test('only structured parent cache values are parsed as JSON', () => {
  assert.match(jsonKeysBlock, /'parent_profile_data'/);
  assert.match(jsonKeysBlock, /'dev_test_family_v1'/);
  assert.doesNotMatch(jsonKeysBlock, /'parent_profile_done'/);
  assert.doesNotMatch(jsonKeysBlock, /'linked_teen_id'/);
});

test('clearPrivateAccountCache removes the complete canonical private list', () => {
  assert.match(source, /AsyncStorage\.multiRemove\(\[\.\.\.PRIVATE_ACCOUNT_KEYS\]\)/);
});
