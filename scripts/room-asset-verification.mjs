import fs from 'node:fs';
import path from 'node:path';

// Preserved from main@0eea3cb: image metadata, runtime registry and fallback contract.
// The Playwright foreman owns capture/reporting; this module independently checks
// that generated assets are actually wired into the live Expo runtime.
const EXPECTED_NAV = ['Room', 'Pages', 'Calm', 'Circle', 'More'];
const REGISTRY_CONSUMER_FILES = ['src/components/room/character/SekretSprite.tsx'];
function assert(condition, message) { if (!condition) throw new Error(message); }

// A manifest is data, not permission to read arbitrary local files.
// Constrain all runtime asset reads to the chosen workspace and reject symlink components.
export function resolveAssetPath(rootDir, relativePath) {
  assert(typeof relativePath === 'string' && relativePath.length > 0
    && !path.isAbsolute(relativePath) && !relativePath.includes('\0'),
    'Unsafe room asset path.');
  assert(!relativePath.split(/[\\\\/]/).includes('..'), 'Room asset path escapes workspace.');
  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, relativePath);
  const withinRoot = path.relative(root, absolute);
  assert(withinRoot && withinRoot !== '..' && !withinRoot.startsWith(`..${path.sep}`)
    && !path.isAbsolute(withinRoot), 'Room asset path escapes workspace.');
  let current = root;
  for (const part of withinRoot.split(path.sep)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Room asset symlink target rejected.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return absolute;
}

function fileToken(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function parseSize(value) {
  const match = /^(\d+)x(\d+)$/.exec(String(value || ''));
  if (!match) throw new Error(`Invalid image size contract: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseAspectRatio(value) {
  const match = /^(\d+):(\d+)$/.exec(String(value || ''));
  if (!match) throw new Error(`Invalid aspect ratio contract: ${value}`);
  return Number(match[1]) / Number(match[2]);
}

function validateManifest(manifest, promptPack) {
  assert(manifest.schemaVersion === 1, 'Unsupported room manifest schemaVersion.');
  assert(manifest.repository === 'jussray/Sekret-Bip', 'Manifest repository mismatch.');
  assert(JSON.stringify(manifest.policies?.bottomNavigation) === JSON.stringify(EXPECTED_NAV), `Bottom navigation must remain exactly: ${EXPECTED_NAV.join(', ')}`);
  assert(manifest.policies.bottomNavigationLocked === true, 'Bottom navigation must be locked.');
  assert(manifest.policies.userRoomOwnsDashboardCards === true, 'User Room must own dashboard/update cards.');
  assert(manifest.policies.companionRoomsRejectDashboardCards === true, 'Companion rooms must reject dashboard cards.');
  assert(manifest.policies.companionRoomsArePermanentDestinations === true, 'Companion rooms must remain permanent destinations.');
  assert(JSON.stringify(manifest.productionScope?.characters) === JSON.stringify(['night']), 'The first production slice must contain only Night.');
  assert(JSON.stringify(manifest.productionScope?.rooms) === JSON.stringify(['night']), 'The first room production slice must contain only Night.');
  assert(manifest.rooms?.night?.verticalSlice === true, 'Night must remain the first vertical slice.');
  assert(manifest.runtime?.assetRegistry, 'Runtime asset registry is required.');
  assert(Array.isArray(manifest.runtime?.registryConsumers) && manifest.runtime.registryConsumers.length > 0, 'Runtime registry consumers are required.');
  const requiredPoses = manifest.characters.night.requiredPoses;
  const promptedPoses = promptPack.poses.map(item => item.id);
  assert(JSON.stringify(requiredPoses) === JSON.stringify(promptedPoses), 'Night prompt pose order must exactly match the manifest.');
  assert(JSON.stringify(manifest.phases) === JSON.stringify(promptPack.roomPhases.map(item => item.id)), 'Room phase order must exactly match the prompt pack.');
  assert(promptPack.canonicalMaster === manifest.characters.night.canonicalMaster, 'Canonical Night master mismatch.');
  assert(promptPack.roomMaster === manifest.rooms.night.baseAsset, 'Night room master mismatch.');
}

function buildQueue(promptPack) {
  return [
    ...promptPack.poses.map(pose => ({ kind: 'character-pose', characterId: 'night', pose: pose.id, file: pose.file, fallback: promptPack.canonicalMaster })),
    ...promptPack.roomPhases.map(phase => ({ kind: 'room-phase', roomId: 'night', phase: phase.id, file: phase.file, fallback: promptPack.roomMaster })),
  ];
}

function pngMetadata(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('invalid_png');
  const colorType = buffer[25];
  return { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), transparent: colorType === 4 || colorType === 6 || buffer.includes(Buffer.from('tRNS')) };
}

function jpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('invalid_jpeg');
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sofMarkers.has(marker)) return { format: 'jpeg', width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3), transparent: false };
    offset += length;
  }
  throw new Error('jpeg_dimensions_missing');
}

function readImageMetadata(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return pngMetadata(buffer);
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegMetadata(buffer);
  throw new Error('unsupported_image_format');
}

function validateImage(filePath, requirements = {}) {
  const metadata = readImageMetadata(filePath);
  if (requirements.format && metadata.format !== requirements.format) throw new Error(`expected_${requirements.format}_received_${metadata.format}`);
  if (requirements.minimumWidth && metadata.width < requirements.minimumWidth) throw new Error(`width_${metadata.width}_below_${requirements.minimumWidth}`);
  if (requirements.minimumHeight && metadata.height < requirements.minimumHeight) throw new Error(`height_${metadata.height}_below_${requirements.minimumHeight}`);
  if (requirements.transparent && !metadata.transparent) throw new Error('transparent_background_required');
  if (requirements.aspectRatio) {
    const actual = metadata.width / metadata.height;
    if (Math.abs(actual - requirements.aspectRatio) > 0.03) throw new Error(`aspect_ratio_${actual.toFixed(3)}_outside_contract`);
  }
  if (requirements.sameDimensionsAs && (metadata.width !== requirements.sameDimensionsAs.width || metadata.height !== requirements.sameDimensionsAs.height)) {
    throw new Error(`geometry_dimensions_${metadata.width}x${metadata.height}_differ_from_${requirements.sameDimensionsAs.width}x${requirements.sameDimensionsAs.height}`);
  }
  return metadata;
}


function registryBlock(source, collectionName, key) {
  const collectionIndex = source.indexOf(`export const ${collectionName}`);
  assert(collectionIndex >= 0, `Registry is missing ${collectionName}.`);
  const lines = source.slice(collectionIndex).split('\n');
  const start = lines.findIndex(line => line.trimStart().startsWith(`${key}:`));
  assert(start >= 0, `Registry is missing ${collectionName}.${key}.`);
  const entry = lines[start].trim();
  if (entry.includes('fallback(')) return { kind: 'fallback-call', body: entry };
  const candidate = lines.slice(start, start + 20).join('\n');
  const open = candidate.indexOf('{');
  const close = candidate.indexOf('}', open + 1);
  assert(open >= 0 && close > open, `Registry entry ${collectionName}.${key} must be a static object or a reviewed fallback call.`);
  return { kind: 'object', body: candidate.slice(open + 1, close) };
}

function requirePathFor(registryPath, assetPath) {
  let relative = path.relative(path.dirname(registryPath), assetPath).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function validateRegistryConsumer(manifest, rootDir) {
  for (const consumer of manifest.runtime.registryConsumers) {
    assert(REGISTRY_CONSUMER_FILES.includes(consumer), 'Unknown registry consumer.');
  }
  for (const file of REGISTRY_CONSUMER_FILES) {
    const source = fs.readFileSync(resolveAssetPath(rootDir, file), 'utf8');
    assert(source.includes('NIGHT_ROOM_POSE_ASSETS'), `${file} does not consume NIGHT_ROOM_POSE_ASSETS.`);
  }
}

function verifyAssets({ rootDir, manifest, promptPack }) {
  const results = [];
  const registryRelative = manifest.runtime.assetRegistry;
  const registryPath = resolveAssetPath(rootDir, registryRelative);
  const registrySource = fs.readFileSync(registryPath, 'utf8');
  validateRegistryConsumer(manifest, rootDir);
  const minimum = parseSize(promptPack.output.minimumSize);
  const aspectRatio = parseAspectRatio(promptPack.output.aspectRatio);
  const canonicalPath = resolveAssetPath(rootDir, promptPack.canonicalMaster);
  const canonicalRequire = requirePathFor(registryRelative, promptPack.canonicalMaster);
  assert(registrySource.includes(`require('${canonicalRequire}')`), 'Canonical Night fallback is not statically required by the runtime registry.');
  let canonicalMetadata;
  try {
    canonicalMetadata = validateImage(canonicalPath, { format: 'png', transparent: true });
    results.push({ status: 'pass', label: promptPack.canonicalMaster, detail: `${canonicalMetadata.width}x${canonicalMetadata.height} transparent canonical fallback` });
  } catch (error) {
    results.push({ status: 'fail', label: promptPack.canonicalMaster, detail: error instanceof Error ? error.message : String(error) });
    return results;
  }
  for (const pose of promptPack.poses) {
    const absolute = resolveAssetPath(rootDir, pose.file);
    const entry = registryBlock(registrySource, 'NIGHT_ROOM_POSE_ASSETS', pose.id);
    const block = entry.body;
    const isCanonicalPose = pose.file === promptPack.canonicalMaster;
    const usesCanonicalFile = isCanonicalPose
      && block.includes('generatedFile: canonicalFile')
      && registrySource.includes(`const canonicalFile = '${promptPack.canonicalMaster}'`);
    const usesFallbackHelper = entry.kind === 'fallback-call'
      && block.includes(`fallback('${pose.file}')`);
    if (usesFallbackHelper) {
      assert(registrySource.includes('function fallback('), 'Unknown runtime fallback helper.');
      assert(registrySource.includes('source: canonicalNight')
        && registrySource.includes('activeFile: canonicalFile')
        && registrySource.includes("status: 'fallback'"), 'Runtime fallback helper does not use the canonical asset.');
    } else {
      assert(block.includes(`generatedFile: '${pose.file}'`) || usesCanonicalFile,
        `Registry generatedFile mismatch for ${pose.id}.`);
    }
    if (!fs.existsSync(absolute)) {
      assert(usesFallbackHelper || block.includes(`activeFile: '${promptPack.canonicalMaster}'`),
        `Missing pose ${pose.id} must activate the canonical fallback.`);
      assert(usesFallbackHelper || block.includes("status: 'fallback'"),
        `Missing pose ${pose.id} must be marked fallback.`);
      results.push({ status: 'fallback', label: pose.file, detail: `using ${promptPack.canonicalMaster}` });
      continue;
    }
    if (usesFallbackHelper) throw new Error(`Present pose ${pose.id} is not statically required by the runtime registry.`);
    const expectedRequire = requirePathFor(registryRelative, pose.file);
    assert(block.includes(`require('${expectedRequire}')`)
      || (isCanonicalPose && (block.includes('source: canonicalNight') || block.includes(`require('${expectedRequire}')`))),
      `Present pose ${pose.id} is not statically required by the runtime registry.`);
    assert(block.includes(`activeFile: '${pose.file}'`)
      || (isCanonicalPose && block.includes('activeFile: canonicalFile')),
      `Present pose ${pose.id} is not active in the runtime registry.`);
    assert(block.includes("status: 'generated'"), `Present pose ${pose.id} must be marked generated.`);
    try {
      const isCanonical = pose.file === promptPack.canonicalMaster;
      const metadata = validateImage(absolute, { format: 'png', transparent: true, ...(isCanonical ? {} : { minimumWidth: minimum.width, minimumHeight: minimum.height, aspectRatio }) });
      results.push({ status: 'pass', label: pose.file, detail: `${metadata.width}x${metadata.height} transparent runtime pose` });
    } catch (error) {
      results.push({ status: 'fail', label: pose.file, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  const roomMasterPath = resolveAssetPath(rootDir, promptPack.roomMaster);
  let roomMasterMetadata;
  try {
    roomMasterMetadata = validateImage(roomMasterPath, { format: 'jpeg' });
  } catch (error) {
    results.push({ status: 'fail', label: promptPack.roomMaster, detail: error instanceof Error ? error.message : String(error) });
    return results;
  }
  for (const phase of promptPack.roomPhases) {
    const absolute = resolveAssetPath(rootDir, phase.file);
    const block = registryBlock(registrySource, 'NIGHT_ROOM_PHASE_ASSETS', phase.id).body;
    assert(block.includes(`file: '${phase.file}'`), `Registry file mismatch for room phase ${phase.id}.`);
    if (!fs.existsSync(absolute)) {
      results.push({ status: 'missing', label: phase.file, detail: 'Night room phase is required.' });
      continue;
    }
    const expectedRequire = requirePathFor(registryRelative, phase.file);
    assert(block.includes(`require('${expectedRequire}')`), `Room phase ${phase.id} is not statically required by the runtime registry.`);
    try {
      const metadata = validateImage(absolute, { format: 'jpeg', sameDimensionsAs: roomMasterMetadata });
      results.push({ status: 'pass', label: phase.file, detail: `${metadata.width}x${metadata.height} geometry-locked room phase` });
    } catch (error) {
      results.push({ status: 'fail', label: phase.file, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}


export function hasBlockingResults(results) {
  return results.some(result => ['missing', 'blocked', 'fail'].includes(result.status));
}
export { buildQueue, fileToken, parseAspectRatio, parseSize, readImageMetadata, validateImage, validateManifest, verifyAssets };
