import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  fileToken,
  hasBlockingResults,
  readImageMetadata,
  validateImage,
  validateManifest,
  verifyAssets,
} from '../scripts/room-production-foreman.mjs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function png(width, height, colorType = 6) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = colorType;
  return buffer;
}

function jpeg(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test('room contracts preserve the product navigation and dedicated CI gate', () => {
  const layout = read('app/(teen)/_layout.tsx');
  const e2e = read('e2e/rooms/room-contract.spec.ts');
  const workflow = read('.github/workflows/playwright.yml');
  const config = read('playwright.config.ts');
  const registry = read('src/config/nightRoomAssetRegistry.ts');
  const sprite = read('src/components/room/character/SekretSprite.tsx');
  for (const route of ['room', 'pages', 'calm', 'circle', 'more']) assert.match(layout, new RegExp(`name="${route}"`));
  assert.match(layout, /name="circle\/feed-v2" options=\{\{ href: null \}\}/);
  assert.match(e2e, /normalizeTabLabel/);
  assert.match(e2e, /\['Room', 'Pages', 'Calm', 'Circle', 'More'\]/);
  assert.match(config, /'\*\*\/rooms\/\*\*'/);
  assert.match(workflow, /npm run room:foreman:verify/);
  assert.match(workflow, /npm run test:e2e:rooms/);
  assert.match(workflow, /\.room-foreman\/runs\//);
  assert.match(sprite, /NIGHT_ROOM_POSE_ASSETS\.neutral\.source/);
  assert.match(registry, /NIGHT_ROOM_PHASE_ASSETS/);
});

test('manifest and prompt pack remain one Night vertical slice', () => {
  const manifest = JSON.parse(read('config/room-production.manifest.json'));
  const promptPack = JSON.parse(read('config/leonardo/night-asset-prompt-pack.json'));
  validateManifest(manifest, promptPack);
  assert.deepEqual(manifest.productionScope.characters, ['night']);
  assert.deepEqual(manifest.productionScope.rooms, ['night']);
  assert.equal(promptPack.poses.some(item => item.id === 'moonChair' && item.file.endsWith('moon-chair.png')), true);
});

test('camel-case IDs normalize to canonical filenames', () => {
  assert.equal(fileToken('moonChair'), 'moon-chair');
  assert.equal(fileToken('deepNight'), 'deep-night');
});

test('image parsing validates format, dimensions, and transparency', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room-image-contract-'));
  const alpha = path.join(root, 'alpha.png');
  const opaque = path.join(root, 'opaque.png');
  const room = path.join(root, 'room.jpg');
  fs.writeFileSync(alpha, png(4, 6, 6));
  fs.writeFileSync(opaque, png(4, 6, 2));
  fs.writeFileSync(room, jpeg(16, 9));
  assert.deepEqual(readImageMetadata(alpha), { format: 'png', width: 4, height: 6, transparent: true });
  assert.equal(readImageMetadata(room).format, 'jpeg');
  assert.throws(() => validateImage(opaque, { format: 'png', transparent: true }), /transparent_background_required/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('verification passes declared fallbacks and blocks present but unwired poses', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'room-foreman-contract-'));
  const canonical = 'assets/night/neutral.png';
  const thinking = 'assets/night/thinking.png';
  const day = 'assets/room/day.jpg';
  const night = 'assets/room/night.jpg';
  write(root, canonical, png(2, 3, 6));
  write(root, day, jpeg(20, 10));
  write(root, night, jpeg(20, 10));
  write(root, 'src/consumer.ts', "import { NIGHT_ROOM_POSE_ASSETS } from './registry';\nexport const active = NIGHT_ROOM_POSE_ASSETS.neutral.source;\n");
  write(root, 'src/registry.ts', `
export const NIGHT_ROOM_POSE_ASSETS = {
  neutral: { source: require('../assets/night/neutral.png'), generatedFile: '${canonical}', activeFile: '${canonical}', status: 'generated' },
  thinking: { source: require('../assets/night/neutral.png'), generatedFile: '${thinking}', activeFile: '${canonical}', status: 'fallback' },
};
export const NIGHT_ROOM_PHASE_ASSETS = {
  day: { source: require('../assets/room/day.jpg'), file: '${day}' },
  night: { source: require('../assets/room/night.jpg'), file: '${night}' },
};
`);
  const manifest = { runtime: { assetRegistry: 'src/registry.ts', registryConsumers: ['src/consumer.ts'] } };
  const promptPack = {
    canonicalMaster: canonical,
    roomMaster: day,
    output: { minimumSize: '2x3', aspectRatio: '2:3' },
    poses: [{ id: 'neutral', file: canonical }, { id: 'thinking', file: thinking }],
    roomPhases: [{ id: 'day', file: day }, { id: 'night', file: night }],
  };
  const fallbackResults = verifyAssets({ rootDir: root, manifest, promptPack });
  assert.equal(fallbackResults.some(item => item.status === 'fallback' && item.label === thinking), true);
  assert.equal(hasBlockingResults(fallbackResults), false);
  write(root, thinking, png(2, 3, 6));
  assert.throws(() => verifyAssets({ rootDir: root, manifest, promptPack }), /not statically required/);
  write(root, 'src/registry.ts', `
export const NIGHT_ROOM_POSE_ASSETS = {
  neutral: { source: require('../assets/night/neutral.png'), generatedFile: '${canonical}', activeFile: '${canonical}', status: 'generated' },
  thinking: { source: require('../assets/night/thinking.png'), generatedFile: '${thinking}', activeFile: '${thinking}', status: 'generated' },
};
export const NIGHT_ROOM_PHASE_ASSETS = {
  day: { source: require('../assets/room/day.jpg'), file: '${day}' },
  night: { source: require('../assets/room/night.jpg'), file: '${night}' },
};
`);
  const generatedResults = verifyAssets({ rootDir: root, manifest, promptPack });
  assert.equal(generatedResults.some(item => item.status === 'pass' && item.label === thinking), true);
  assert.equal(hasBlockingResults(generatedResults), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test('blocked interactive or verification results require a nonzero outcome', () => {
  assert.equal(hasBlockingResults([{ status: 'blocked' }]), true);
  assert.equal(hasBlockingResults([{ status: 'missing' }]), true);
  assert.equal(hasBlockingResults([{ status: 'fallback' }, { status: 'pass' }]), false);
});
