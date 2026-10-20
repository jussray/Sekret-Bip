import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const mirroredRoutes = [
  ['room', 'app/(parent)/room.tsx'],
  ['pages', 'app/(parent)/pages.tsx'],
  ['calm', 'app/(parent)/calm.tsx'],
  ['circle', 'app/(parent)/circle/index.tsx'],
  ['bridge', 'app/(parent)/bridge.tsx'],
  ['voicebip', 'app/(parent)/voicebip.tsx'],
  ['more', 'app/(parent)/more.tsx'],
  ['settings', 'app/(parent)/settings.tsx'],
];

for (const [name, path] of mirroredRoutes) {
  test(`parent side includes a ${name} route`, () => {
    assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist`);
  });
}

test('parent bottom navigation mirrors the five primary teen destinations', () => {
  const layout = read('app/(parent)/_layout.tsx');
  for (const route of ['room', 'pages', 'calm', 'circle', 'more']) {
    assert.match(layout, new RegExp(`Tabs\\.Screen\\s+name=["']${route}["']`));
  }
});

test('parent routes do not directly read private teen storage collections', () => {
  const parentFiles = mirroredRoutes.map(([, path]) => read(path)).join('\n');
  for (const privateKey of ['journalText', 'voiceNotes', 'periodDays', 'lastPeriodStart', 'oracleSessions', 'roomMemory']) {
    assert.doesNotMatch(parentFiles, new RegExp(`AsyncStorage\\.(?:getItem|multiGet)\\([^)]*${privateKey}`));
  }
});

test('parent pages use parent-owned reflection state', () => {
  const pages = read('app/(parent)/pages.tsx');
  assert.match(pages, /parentPagesDraft/);
  assert.match(pages, /parentPagesEntries/);
  assert.match(pages, /saveParentPageEntry/);
});

test('parent bridge remains a dedicated parent route', () => {
  const bridge = read('app/(parent)/bridge.tsx');
  assert.match(bridge, /ParentBridgeSummaryScreen/);
});

test('parent More exposes parent-safe mirrored support destinations', () => {
  const screenPurpose = read('src/constants/screenPurpose.ts');
  for (const label of ['Bridge', 'Parent Voice Bip', 'Bippin 2', 'Connection Hub', 'Parent Circle', 'Parent Profile', 'Parent Link', 'Resources']) {
    assert.match(screenPurpose, new RegExp(label), `PARENT_MORE_GROUPS must include "${label}"`);
  }
});

test('parent route aliases resolve mirror-only destinations instead of falling back to room', () => {
  const routes = read('src/shared/routes.ts');
  assert.match(routes, /'parent-voicebip':\s*PARENT_ROUTES\.voiceBip/);
  assert.match(routes, /'parent-connection':\s*PARENT_ROUTES\.bridge/);
  assert.match(routes, /'parent-insights':\s*PARENT_ROUTES\.more/);
});
