import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registry = await readFile(new URL('../src/config/companionRuntimeRegistry.ts', import.meta.url), 'utf8');
const sprite = await readFile(new URL('../src/components/room/character/SekretSprite.tsx', import.meta.url), 'utf8');
const layer = await readFile(new URL('../src/components/room/character/CharacterLayer.tsx', import.meta.url), 'utf8');
const userRoom = await readFile(new URL('../screens/UserRoomScreen.tsx', import.meta.url), 'utf8');
const themeEntry = await readFile(new URL('../constants/theme.ts', import.meta.url), 'utf8');
const themeBase = await readFile(new URL('../constants/theme.base.ts', import.meta.url), 'utf8');
const companionImages = await readFile(new URL('../src/constants/companionImages.ts', import.meta.url), 'utf8');
const companionManifest = await readFile(new URL('../src/constants/companionManifest.ts', import.meta.url), 'utf8');

test('canonical companion identities preserve only legacy compatibility aliases', () => {
  assert.match(registry, /type CompanionId = 'night' \| 'suhana' \| 'sy' \| 'cloud' \| 'mom' \| 'dad'/);
  assert.match(registry, /if \(key === 'raylene'\) return 'suhana'/);
  assert.match(registry, /if \(key === 'rylane'\) return 'sy'/);
  assert.match(registry, /label: 'Suhana'/);
  assert.match(registry, /label: 'Sy'/);
});

test('Room avatars use the same canonical human masters as the runtime', () => {
  for (const [label, file, key] of [
    ['Suhana', 'raylene/raylene-master.png', 'suhanaRoomSprite'],
    ['Sy', 'rylane/rylane-master.png', 'syRoomSprite'],
  ]) {
    assert.ok(registry.includes('../../assets/images/companions/' + file), label + ' runtime master missing');
    assert.ok(
      themeEntry.includes('const ' + key + " = require('../assets/images/companions/" + file + "');"),
      label + ' Room must use the runtime master, not historical reference artwork',
    );
  }
  assert.ok(themeEntry.includes("const nightRoomSprite = require('../assets/images/companions/teen/night/neutral.png');"));
  assert.match(themeEntry, /rayleneFullbody:\s*suhanaRoomSprite/);
  assert.match(themeEntry, /rylaneFullbody:\s*syRoomSprite/);
  assert.match(themeEntry, /nightFullbody:\s*nightRoomSprite/);
  assert.doesNotMatch(themeEntry, /raylene-neutral-new\.png/);
});

test('legacy pose aliases do not import reference-only character PNGs', () => {
  const imageImports = Array.from(themeBase.matchAll(/require\(([^)]+)\)/g), (m) => m[1]);
  for (const prefix of ['raylene-', 'rylane-', 'night-']) {
    assert.ok(
      imageImports.every((path) => !path.includes('/assets/images/' + prefix)),
      prefix + ' historical pose PNGs must be absent from the native module graph',
    );
  }
  for (const alias of ['suhanaCanonical', 'syCanonical', 'nightCanonical']) {
    assert.ok(themeBase.includes('= ' + alias + ';'), alias + ' must own compatibility poses');
  }
  assert.ok(themeBase.includes('companions/raylene/raylene-master.png'));
  assert.ok(themeBase.includes('companions/rylane/rylane-master.png'));
  assert.ok(themeBase.includes('companions/teen/night/neutral.png'));
});

test('existing teen companion pose registry remains backward compatible', () => {
  for (const id of ['raylene', 'rylane', 'night']) {
    assert.ok(companionImages.includes("neutral: require('../../assets/images/companions/teen/" + id + "/neutral.png')"));
    assert.ok(companionManifest.includes(id + ": buildEntries('" + id + "', { neutral: 'production' })"));
  }
});

test('Teen Room uses the canonical runtime label at user-facing legacy-key boundaries', () => {
  assert.match(
    userRoom,
    /import \{ getCompanionRuntime \} from '@\/config\/companionRuntimeRegistry';/,
  );
  assert.match(userRoom, /getCompanionRuntime\(companion\)\.label/);
  assert.match(userRoom, /getCompanionRuntime\(id\)\.label/);
  assert.match(userRoom, /const cRuntime\s*=\s*getCompanionRuntime\(cId\)/);
  assert.match(userRoom, /accessibilityLabel={`\$\{cRuntime\.label\} is here\. Tap to talk\.`}/);
  assert.doesNotMatch(userRoom, /Raylene's Room/);
  assert.doesNotMatch(userRoom, /Rylane's Room/);
  assert.doesNotMatch(userRoom, /Raylene is nearby/);
  assert.doesNotMatch(userRoom, /Rylane is posted up/);
});

test('each companion receives a role-specific runtime contract', () => {
  assert.match(registry, /role: 'room-anchor'/);
  assert.match(registry, /role: 'lead'/);
  assert.match(registry, /role: 'guardian'/);
  assert.match(registry, /role: 'support'/);
  assert.match(registry, /anchor: \{ horizontal: 'left', bottomPercent: 28 \}/);
  assert.match(registry, /idleAmplitude: 10, idleDurationMs: 3000/);
});

test('unapproved parent sprites fail closed instead of using a room screenshot', () => {
  assert.match(registry, /mom:[\s\S]*source: null,[\s\S]*available: false/);
  assert.match(registry, /dad:[\s\S]*source: null,[\s\S]*available: false/);
  assert.doesNotMatch(sprite, /bg-raylene-room-day/);
  assert.match(sprite, /if \(!runtime\.available \|\| !runtime\.source\) return null/);
  assert.match(layer, /if \(!runtime\.available\) return null/);
});

test('renderer and placement layer consume the shared registry', () => {
  assert.match(sprite, /getCompanionRuntime\(sekret\)/);
  assert.match(sprite, /testID={`companion-\$\{runtime\.id\}`}/);
  assert.match(layer, /styles\[runtime\.anchor\.horizontal\]/);
  assert.match(layer, /testID={`companion-layer-\$\{runtime\.id\}`}/);
});
