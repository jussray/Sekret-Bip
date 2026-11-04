import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const registryPath = new URL('../src/config/nightRoomAssetRegistry.ts', import.meta.url);
const companionRegistryPath = new URL('../src/config/companionRuntimeRegistry.ts', import.meta.url);
const spritePath = new URL('../src/components/room/character/SekretSprite.tsx', import.meta.url);
const neutralAssetPath = new URL('../assets/images/companions/teen/night/neutral.png', import.meta.url);

const expectedFallbacks = {
  thinking: 'assets/images/companions/teen/night/thinking.png',
  writing: 'assets/images/companions/teen/night/writing.png',
  window: 'assets/images/companions/teen/night/window.png',
  listening: 'assets/images/companions/teen/night/listening.png',
  headphones: 'assets/images/companions/teen/night/headphones.png',
  microphone: 'assets/images/companions/teen/night/microphone.png',
  moonChair: 'assets/images/companions/teen/night/moon-chair.png',
  resting: 'assets/images/companions/teen/night/resting.png',
};

test('Night registry uses one real canonical PNG and explicit fallbacks', async () => {
  const [registry, neutralPng] = await Promise.all([
    readFile(registryPath, 'utf8'),
    readFile(neutralAssetPath),
  ]);

  assert.deepEqual([...neutralPng.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(neutralPng.length >= 24, 'canonical Night PNG must contain an IHDR chunk');
  assert.ok(neutralPng.readUInt32BE(16) > 0, 'canonical Night PNG width must be positive');
  assert.ok(neutralPng.readUInt32BE(20) > 0, 'canonical Night PNG height must be positive');

  assert.match(
    registry,
    /require\('\.\.\/\.\.\/assets\/images\/companions\/teen\/night\/neutral\.png'\)/,
  );
  assert.equal(
    (registry.match(/\brequire\s*\(/g) ?? []).length,
    1,
    'unavailable poses must not be statically required as if they exist',
  );
  assert.match(registry, /neutral:\s*\{[\s\S]*?status:\s*'generated'/);

  for (const [pose, generatedFile] of Object.entries(expectedFallbacks)) {
    assert.match(
      registry,
      new RegExp(`${pose}:\\s*fallback\\('${generatedFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)`),
      `${pose} must resolve through the canonical fallback`,
    );
  }
});

test('SekretSprite routes Night through the shared companion registry', async () => {
  const [companionRegistry, sprite] = await Promise.all([
    readFile(companionRegistryPath, 'utf8'),
    readFile(spritePath, 'utf8'),
  ]);

  assert.match(
    companionRegistry,
    /import\s*\{\s*getNightPoseAsset\s*\}\s*from\s*'\.\/nightRoomAssetRegistry'/,
  );
  assert.match(companionRegistry, /source:\s*getNightPoseAsset\('neutral'\)\.source/);
  assert.match(sprite, /getCompanionRuntime\(sekret\)/);
  assert.doesNotMatch(
    sprite,
    /night-master\.png/,
    'Night must not bypass the canonical registry chain',
  );
});
