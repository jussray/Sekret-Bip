import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Bridge summary CTA opens the existing Pages consent path', async () => {
  const source = await read('screens/BridgeScreen.tsx');
  assert.match(source, /handleCreateBridgeSummary[\s\S]*setScreen\('pages'\)/);
  assert.match(source, /choose something in Pages/);
  assert.doesNotMatch(source, /summary sharing not ready here yet/);
});

test('L4 has an honest frontend handler without claiming durable memory is active', async () => {
  const routes = await read('src/shared/routes.ts');
  const teenRoutes = await read('src/teen/routes.ts');
  const more = await read('src/constants/screenPurpose.ts');
  const layout = await read('app/(teen)/_layout.tsx');
  const screen = await read('app/(teen)/continuity.tsx');

  assert.match(routes, /l4:\s*TEEN_ROUTES\.continuity/);
  assert.match(teenRoutes, /continuity:\s*'\/\(teen\)\/continuity'/);
  assert.match(more, /Memory & Continuity/);
  assert.match(layout, /name="continuity"/);
  assert.match(screen, /Protected, not active/);
  assert.match(screen, /does not bypass that gate/);
});

test('active Calm controls have real handlers instead of null or empty actions', async () => {
  const source = await read('screens/CalmScreen.tsx');
  assert.doesNotMatch(source, /action: null/);
  assert.match(source, /reset plan ↺/);
  assert.match(source, /Calm Picks for You[\s\S]*onOpenBreathe/);
  assert.match(source, /MORE_BREATHING[\s\S]*TouchableOpacity/);
  assert.match(source, /CALM_PLAYLIST[\s\S]*TouchableOpacity/);
});
