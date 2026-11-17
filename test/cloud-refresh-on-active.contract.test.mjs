import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(
  path.join(repositoryRoot, 'src/hooks/useAppEffects.ts'),
  'utf8',
);

test('authenticated cloud state refreshes on app activation without overlapping pulls', () => {
  assert.match(source, /AppState as NativeAppState/);
  assert.match(source, /let refreshInFlight = false/);
  assert.match(source, /if \(cancelled \|\| refreshInFlight\) return/);
  assert.match(source, /void refreshCloudState\(\)/);
  assert.match(source, /NativeAppState\.addEventListener\('change', nextState =>/);
  assert.match(source, /if \(nextState === 'active'\) void refreshCloudState\(\)/);
  assert.match(source, /appStateSubscription\.remove\(\)/);
});

test('active refresh reuses the existing authenticated pull-and-merge path', () => {
  assert.match(source, /getCurrentSessionUserId\(\)/);
  assert.match(source, /const cloud = await pullAll\(\)/);
  assert.match(source, /mergeById\(prev\.journalEntries,\s+cloud\.journalEntries\)/);
  assert.match(source, /mergeById\(prev\.circlePosts,\s+cloud\.circlePosts\)/);
  assert.match(source, /const cloudDays = await loadPeriodDays\(\)/);
  assert.match(source, /restoreOracleDiscovery\('teen'\)/);
});
