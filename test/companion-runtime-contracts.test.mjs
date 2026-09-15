import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registry = await readFile(new URL('../src/config/companionRuntimeRegistry.ts', import.meta.url), 'utf8');
const sprite = await readFile(new URL('../src/components/room/character/SekretSprite.tsx', import.meta.url), 'utf8');
const layer = await readFile(new URL('../src/components/room/character/CharacterLayer.tsx', import.meta.url), 'utf8');
const userRoom = await readFile(new URL('../screens/UserRoomScreen.tsx', import.meta.url), 'utf8');
const themeEntry = await readFile(new URL('../constants/theme.ts', import.meta.url), 'utf8');
const companionImages = await readFile(new URL('../src/constants/companionImages.ts', import.meta.url), 'utf8');
const companionManifest = await readFile(new URL('../src/constants/companionManifest.ts', import.meta.url), 'utf8');
const roomAssetMap = await readFile(new URL('../ROOM_ASSET_MAP.md', import.meta.url), 'utf8');

test('canonical companion identities preserve only legacy compatibility aliases', () => {
  assert.match(registry, /type CompanionId = 'night' \| 'suhana' \| 'sy' \| 'cloud' \| 'mom' \| 'dad'/);
  assert.match(registry, /if \(key === 'raylene'\) return 'suhana'/);
  assert.match(registry, /if \(key === 'rylane'\) return 'sy'/);
  assert.match(registry, /label: 'Suhana'/);
  assert.match(registry, /label: 'Sy'/);
});

test('Suhana Room alias uses the documented separated production avatar layer', () => {
  assert.match(
    roomAssetMap,
    /`assets\/images\/raylene-neutral-new\.png` \| neutral \| NO \| NO \| YES \|/,
    'Asset inventory must classify raylene-neutral-new.png as production',
  );
  assert.match(
    roomAssetMap,
    /These are already separate from room backgrounds\.[\s\S]*ready for the avatar layer in the new system with no extraction needed\./,
    'Asset inventory must preserve the separate-avatar authority for character images',
  );
  assert.match(
    themeEntry,
    /const\s+suhanaRoomSprite\s*=\s*require\(['"]\.\.\/assets\/images\/raylene-neutral-new\.png['"]\)/,
    'Suhana Room sprite must use the documented separated production avatar asset',
  );
  assert.match(themeEntry, /rayleneFullbody:\s*suhanaRoomSprite/);
  assert.match(themeEntry, /raylene:[\s\S]*fullbody:\s*suhanaRoomSprite/);
  assert.doesNotMatch(themeEntry, /companions\/teen\/raylene\/neutral\.png/);
  assert.doesNotMatch(themeEntry, /raylene-master\.png/);
});

test('Sy and Night retain their existing production companion assets until their own visual receipts require change', () => {
  for (const [legacyId, roomConst] of [
    ['rylane', 'syRoomSprite'],
    ['night', 'nightRoomSprite'],
  ]) {
    assert.match(
      companionImages,
      new RegExp(`${legacyId}:[\\s\\S]*neutral: require\\(['\"]\\.\\.\\/\\.\\.\\/assets\\/images\\/companions\\/teen\\/${legacyId}\\/neutral\\.png['\"]\\)`),
      `${legacyId} neutral sprite must exist in the production teen companion registry`,
    );
    assert.match(
      companionManifest,
      new RegExp(`${legacyId}: buildEntries\\('${legacyId}', \\{ neutral: 'production' \\}\\)`),
      `${legacyId} neutral sprite must remain marked production`,
    );
    assert.match(
      themeEntry,
      new RegExp(`const\\s+${roomConst}\\s*=\\s*require\\(['\"]\\.\\.\\/assets\\/images\\/companions\\/teen\\/${legacyId}\\/neutral\\.png['\"]\\)`),
      `${legacyId} Room sprite must remain unchanged absent contrary browser evidence`,
    );
  }

  assert.match(themeEntry, /rylaneFullbody:\s*syRoomSprite/);
  assert.match(themeEntry, /nightFullbody:\s*nightRoomSprite/);
  assert.match(themeEntry, /rylane:[\s\S]*fullbody:\s*syRoomSprite/);
  assert.match(themeEntry, /night:[\s\S]*fullbody:\s*nightRoomSprite/);
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
