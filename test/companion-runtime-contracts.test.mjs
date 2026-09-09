import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registry = await readFile(new URL('../src/config/companionRuntimeRegistry.ts', import.meta.url), 'utf8');
const sprite = await readFile(new URL('../src/components/room/character/SekretSprite.tsx', import.meta.url), 'utf8');
const layer = await readFile(new URL('../src/components/room/character/CharacterLayer.tsx', import.meta.url), 'utf8');
const userRoom = await readFile(new URL('../screens/UserRoomScreen.tsx', import.meta.url), 'utf8');
const themeEntry = await readFile(new URL('../constants/theme.ts', import.meta.url), 'utf8');
const themeBase = await readFile(new URL('../constants/theme.base.ts', import.meta.url), 'utf8');

test('canonical companion identities preserve only legacy compatibility aliases', () => {
  assert.match(registry, /type CompanionId = 'night' \| 'suhana' \| 'sy' \| 'cloud' \| 'mom' \| 'dad'/);
  assert.match(registry, /if \(key === 'raylene'\) return 'suhana'/);
  assert.match(registry, /if \(key === 'rylane'\) return 'sy'/);
  assert.match(registry, /label: 'Suhana'/);
  assert.match(registry, /label: 'Sy'/);
});

test('public image map preserves the existing Suhana full-body asset authority', () => {
  assert.match(
    themeBase,
    /const\s+rayleneFullbody\s*=\s*require\(["']\.\.\/assets\/images\/raylene-confident-new\.png["']\)/,
  );
  assert.doesNotMatch(
    themeEntry,
    /raylene-fullbody\.png/,
    'The public theme entry must not replace the proven base full-body asset with the cropped legacy file',
  );
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
