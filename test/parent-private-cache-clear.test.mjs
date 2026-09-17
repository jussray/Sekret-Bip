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

test('companion memory and wellbeing corrections are private account state', () => {
  assert.match(source, /'sekret_companion_memory'/);
  assert.match(source, /'sekret_wellbeing_dismissed_v1'/);
  assert.match(source, /'oracle_relationship_profile_teen'/);
});

test('private expression, sleep, and parent cycle caches clear on account transition', () => {
  for (const key of [
    's2tell_saved',
    's2tell_history',
    'sleepWindow',
    'parentOwnCycleDays',
    'parentOwnCycleStart',
  ]) {
    assert.match(source, new RegExp(`'${key}'`));
  }
});

test('private cache removal failures propagate across the sign-out boundary', () => {
  const clearBody = source.match(/export async function clearPrivateAccountCache\(\): Promise<void> \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(clearBody, /await AsyncStorage\.multiRemove\(\[\.\.\.PRIVATE_ACCOUNT_KEYS\]\)/);
  assert.doesNotMatch(clearBody, /catch\s*\(/);
});
