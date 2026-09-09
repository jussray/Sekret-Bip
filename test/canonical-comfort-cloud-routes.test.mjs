import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const preservedCloudPath = 'docs/implementation-history/comfort-cloud/2026-07-18-cloud-route-direct.tsx.txt';
const preservedComfortPath = 'docs/implementation-history/comfort-cloud/2026-07-18-comfort-route-direct.tsx.txt';

test('Cloud route delegates to the existing canonical screen', async () => {
  const source = await read('app/(teen)/cloud.tsx');

  assert.match(source, /import \{ CloudThoughtsScreen \} from '@screens\/CloudThoughtsScreen'/);
  assert.match(source, /<CloudThoughtsScreen/);
  assert.match(source, /backTarget="calm"/);
  assert.match(source, /setScreen=\{\(screen: string\) => navigateTo\(screen, 'teen'\)\}/);
  assert.doesNotMatch(source, /AsyncStorage|cloud_thoughts|src\/lib\/supabase/);
  assert.doesNotMatch(source, /Only you can see this\. Nothing is shared/);
});

test('Comfort route delegates to the existing canonical screen and retains evidence', async () => {
  const source = await read('app/(teen)/comfort.tsx');

  assert.match(source, /import \{ ComfortScreen \} from '@screens\/ComfortScreen'/);
  assert.match(source, /<ComfortScreen/);
  assert.match(source, /onComplete=\{\(\) => emitEvent\('comfort_completed'\)\}/);
  assert.match(source, /setScreen=\{\(screen: string\) => navigateTo\(screen, 'teen'\)\}/);
  assert.doesNotMatch(source, /BREATH_CYCLE|GROUND_STEPS|AFFIRMATIONS/);
  assert.doesNotMatch(source, /This is your private space\. Nothing here is shared/);
});

test('route wrappers preserve app context and theme authority', async () => {
  const [cloud, comfort] = await Promise.all([
    read('app/(teen)/cloud.tsx'),
    read('app/(teen)/comfort.tsx'),
  ]);

  for (const source of [cloud, comfort]) {
    assert.match(source, /useAppContext\(\)/);
    assert.match(source, /THEME_PACKS\[theme\] \?\? THEME_PACKS\.neon/);
    assert.match(source, /selectedSekret=\{selectedSekret\}/);
    assert.match(source, /mood=\{mood\}/);
  }
});

test('direct implementations remain preserved as inert source material', async () => {
  const [cloud, comfort, status] = await Promise.all([
    read(preservedCloudPath),
    read(preservedComfortPath),
    read('docs/implementation-history/comfort-cloud/README.md'),
  ]);

  assert.match(cloud, /cloud_thoughts/);
  assert.match(cloud, /AsyncStorage/);
  assert.match(comfort, /BREATH_CYCLE/);
  assert.match(comfort, /GROUND_STEPS/);
  assert.match(status, /preserve the direct route implementations byte-for-byte/);
  assert.match(status, /filenames end in `\.txt`/);
  assert.match(status, /Do not import, compile, deploy, or treat them as product\/privacy\/database authority/);
  assert.ok(preservedCloudPath.endsWith('.tsx.txt'));
  assert.ok(preservedComfortPath.endsWith('.tsx.txt'));
});
