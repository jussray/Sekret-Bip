import assert from 'node:assert/strict';
import test from 'node:test';
import {
  growthStorageKey, loadGrowthProgress, mergeGrowthKeys,
  parseGrowthKeys, persistGrowthProgress,
} from '../src/features/growth/progress.ts';

function harness() {
  const saved = new Map([['bip_growth_completed', JSON.stringify(['social'])]]);
  const remote = new Map();
  let offline = false;
  const storage = {
    async getItem(k) { return saved.get(k) ?? null; },
    async setItem(k, v) { saved.set(k, v); },
  };
  const cloud = {
    async list(uid) {
      if (offline) throw new Error('offline');
      return [...(remote.get(uid) ?? [])];
    },
    async write(uid, keys) {
      if (offline) throw new Error('offline');
      remote.set(uid, mergeGrowthKeys(remote.get(uid) ?? [], keys));
    },
  };
  return { storage, cloud, saved, remote, setOffline(value) { offline = value; } };
}

test('invalid, unknown, and repeated track values are discarded', () => {
  assert.deepEqual(parseGrowthKeys('{invalid'), []);
  assert.deepEqual(parseGrowthKeys('{}'), []);
  assert.deepEqual(parseGrowthKeys(JSON.stringify(['focus', 'focus', '__proto__', 'money'])), ['focus', 'money']);
});

test('guests never read or claim legacy device-wide progress', async () => {
  const h = harness();
  assert.equal(growthStorageKey(null), null);
  assert.deepEqual(await loadGrowthProgress(null, h.storage, h.cloud), []);
  await persistGrowthProgress(null, ['school'], h.storage, h.cloud);
  assert.equal(h.saved.size, 1);
  assert.equal(h.remote.size, 0);
});

test('two permanent accounts never inherit one another or legacy progress', async () => {
  const h = harness();
  await persistGrowthProgress('owner-a', ['focus'], h.storage, h.cloud);
  await persistGrowthProgress('owner-b', ['school'], h.storage, h.cloud);
  assert.deepEqual(await loadGrowthProgress('owner-a', h.storage, h.cloud), ['focus']);
  assert.deepEqual(await loadGrowthProgress('owner-b', h.storage, h.cloud), ['school']);
  assert.equal(h.saved.get('bip_growth_completed'), JSON.stringify(['social']));
});

test('restoration merges remote and local without duplicates', async () => {
  const h = harness();
  h.saved.set(growthStorageKey('owner-a'), JSON.stringify(['focus', 'focus']));
  h.remote.set('owner-a', ['school']);
  assert.deepEqual(await loadGrowthProgress('owner-a', h.storage, h.cloud), ['focus', 'school']);
  assert.deepEqual(h.remote.get('owner-a'), ['school', 'focus']);
  assert.deepEqual(parseGrowthKeys(h.saved.get(growthStorageKey('owner-a'))), ['focus', 'school']);
});

test('offline completion persists locally and retries when Growth reopens', async () => {
  const h = harness();
  h.setOffline(true);
  await persistGrowthProgress('owner-a', ['habits'], h.storage, h.cloud);
  assert.equal(h.remote.size, 0);
  h.setOffline(false);
  assert.deepEqual(await loadGrowthProgress('owner-a', h.storage, h.cloud), ['habits']);
  assert.deepEqual(h.remote.get('owner-a'), ['habits']);
});

test('repeated completion never creates duplicate keys', async () => {
  const h = harness();
  await persistGrowthProgress('owner-a', ['focus'], h.storage, h.cloud);
  await persistGrowthProgress('owner-a', ['focus'], h.storage, h.cloud);
  assert.deepEqual(h.remote.get('owner-a'), ['focus']);
});
