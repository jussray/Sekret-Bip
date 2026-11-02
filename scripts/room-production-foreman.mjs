#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const EXPECTED_NAV = ['Room', 'Pages', 'Calm', 'Circle', 'More'];
const DEFAULT_MANIFEST = 'config/room-production.manifest.json';
const BLOCKING_STATUSES = new Set(['missing', 'blocked', 'fail']);

function parseArgs(argv) {
  const args = { manifest: DEFAULT_MANIFEST, mode: 'plan', tool: 'all', headless: false, holdMs: 15_000 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') args.manifest = argv[++index];
    else if (arg === '--mode') args.mode = argv[++index];
    else if (arg === '--tool') args.tool = argv[++index];
    else if (arg === '--headless') args.headless = true;
    else if (arg === '--hold-ms') args.holdMs = Number(argv[++index]);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`\nSe’kret Bip room production foreman\n\nUsage:\n  npm run room:foreman:plan\n  npm run room:foreman:verify\n  npm run room:foreman:interactive -- --tool canva\n\nThe foreman never types passwords, bypasses MFA/CAPTCHAs, publishes, merges, or performs destructive editor actions.\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function buildQueue(manifest, promptPack) {
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function registryBlock(source, collectionName, key) {
  const collectionIndex = source.indexOf(`export const ${collectionName}`);
  assert(collectionIndex >= 0, `Registry is missing ${collectionName}.`);
  const tail = source.slice(collectionIndex);
  const pattern = new RegExp(`(?:^|\\n)\\s*${escapeRegex(key)}:\\s*\\{([^\\n]*)\\},?`);
  const match = pattern.exec(tail);
  assert(match, `Registry is missing ${collectionName}.${key}.`);
  return match[1];
}

function requirePathFor(registryPath, assetPath) {
  let relative = path.relative(path.dirname(registryPath), assetPath).replaceAll('\\', '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function validateRegistryConsumer(rootDir, manifest) {
  for (const consumer of manifest.runtime.registryConsumers) {
    const source = fs.readFileSync(path.join(rootDir, consumer), 'utf8');
    assert(source.includes('NIGHT_ROOM_POSE_ASSETS'), `${consumer} does not consume NIGHT_ROOM_POSE_ASSETS.`);
  }
}

function verifyAssets({ rootDir, manifest, promptPack }) {
  const results = [];
  const registryRelative = manifest.runtime.assetRegistry;
  const registryPath = path.join(rootDir, registryRelative);
  const registrySource = fs.readFileSync(registryPath, 'utf8');
  validateRegistryConsumer(rootDir, manifest);
  const minimum = parseSize(promptPack.output.minimumSize);
  const aspectRatio = parseAspectRatio(promptPack.output.aspectRatio);
  const canonicalPath = path.join(rootDir, promptPack.canonicalMaster);
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
    const absolute = path.join(rootDir, pose.file);
    const block = registryBlock(registrySource, 'NIGHT_ROOM_POSE_ASSETS', pose.id);
    assert(block.includes(`generatedFile: '${pose.file}'`), `Registry generatedFile mismatch for ${pose.id}.`);
    if (!fs.existsSync(absolute)) {
      assert(block.includes(`activeFile: '${promptPack.canonicalMaster}'`), `Missing pose ${pose.id} must activate the canonical fallback.`);
      assert(block.includes("status: 'fallback'"), `Missing pose ${pose.id} must be marked fallback.`);
      results.push({ status: 'fallback', label: pose.file, detail: `using ${promptPack.canonicalMaster}` });
      continue;
    }
    const expectedRequire = requirePathFor(registryRelative, pose.file);
    assert(block.includes(`require('${expectedRequire}')`) || pose.file === promptPack.canonicalMaster, `Present pose ${pose.id} is not statically required by the runtime registry.`);
    assert(block.includes(`activeFile: '${pose.file}'`), `Present pose ${pose.id} is not active in the runtime registry.`);
    assert(block.includes("status: 'generated'"), `Present pose ${pose.id} must be marked generated.`);
    try {
      const isCanonical = pose.file === promptPack.canonicalMaster;
      const metadata = validateImage(absolute, { format: 'png', transparent: true, ...(isCanonical ? {} : { minimumWidth: minimum.width, minimumHeight: minimum.height, aspectRatio }) });
      results.push({ status: 'pass', label: pose.file, detail: `${metadata.width}x${metadata.height} transparent runtime pose` });
    } catch (error) {
      results.push({ status: 'fail', label: pose.file, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  const roomMasterPath = path.join(rootDir, promptPack.roomMaster);
  let roomMasterMetadata;
  try {
    roomMasterMetadata = validateImage(roomMasterPath, { format: 'jpeg' });
  } catch (error) {
    results.push({ status: 'fail', label: promptPack.roomMaster, detail: error instanceof Error ? error.message : String(error) });
    return results;
  }
  for (const phase of promptPack.roomPhases) {
    const absolute = path.join(rootDir, phase.file);
    const block = registryBlock(registrySource, 'NIGHT_ROOM_PHASE_ASSETS', phase.id);
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

function writeReports(runDir, report) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'run-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const markdown = ['# Room Foreman Run', '', `- Run: ${report.runId}`, `- Mode: ${report.mode}`, `- Status: ${report.status}`, `- Started: ${report.startedAt}`, `- Finished: ${report.finishedAt}`, '', '## Results', ...report.results.map(result => `- ${result.status.toUpperCase()} — ${result.label}${result.detail ? `: ${result.detail}` : ''}`), ''].join('\n');
  fs.writeFileSync(path.join(runDir, 'run-report.md'), markdown);
}

function resolveWorkspaceUrl(tool, manifest) {
  if (tool === 'canva') return manifest.creativeTools.canva.editUrl;
  if (tool === 'figma') return process.env[manifest.creativeTools.figma.workspaceUrlEnv] ?? '';
  if (tool === 'leonardo') return process.env[manifest.creativeTools.leonardo.workspaceUrlEnv] ?? '';
  if (tool === 'app') return process.env.ROOM_FOREMAN_APP_URL ?? 'http://127.0.0.1:4173/(teen)/room';
  return '';
}

async function runInteractiveTool(tool, manifest, runDir, args) {
  const url = resolveWorkspaceUrl(tool, manifest);
  if (!url) return { status: 'blocked', label: tool, detail: 'Workspace URL environment variable is not configured.' };
  const { chromium } = await import('@playwright/test');
  const profileDir = path.resolve('.room-foreman', 'profiles', tool);
  const evidenceDir = path.join(runDir, 'evidence');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, { headless: args.headless, viewport: { width: 1440, height: 1000 } });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.screenshot({ path: path.join(evidenceDir, `${tool}-workspace.png`), fullPage: true });
    if (!args.headless && args.holdMs > 0) {
      console.log(`[${tool}] Complete login or approval manually. Waiting ${args.holdMs}ms before checkpoint capture.`);
      await page.waitForTimeout(args.holdMs);
      await page.screenshot({ path: path.join(evidenceDir, `${tool}-checkpoint.png`), fullPage: true });
    }
    return { status: 'captured', label: tool, detail: `Evidence saved under ${evidenceDir}.` };
  } finally {
    await context.close();
  }
}

function hasBlockingResults(results) {
  return results.some(result => BLOCKING_STATUSES.has(result.status));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); return; }
  const rootDir = process.cwd();
  const manifestPath = path.resolve(args.manifest);
  const manifest = readJson(manifestPath);
  const promptPack = readJson(path.join(rootDir, manifest.creativeTools.leonardo.promptPack));
  validateManifest(manifest, promptPack);
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.resolve('.room-foreman', 'runs', runId);
  const startedAt = new Date().toISOString();
  const results = [];
  if (args.mode === 'plan') {
    const queue = buildQueue(manifest, promptPack);
    results.push({ status: 'pass', label: 'manifest', detail: `${queue.length} vertical-slice jobs validated.` });
    for (const item of queue) console.log(`${item.kind.padEnd(15)} ${item.pose ?? item.phase} -> ${item.file}`);
  } else if (args.mode === 'verify') {
    results.push(...verifyAssets({ rootDir, manifest, promptPack }));
  } else if (args.mode === 'interactive') {
    const allowed = ['canva', 'figma', 'leonardo', 'app'];
    const tools = args.tool === 'all' ? allowed : [args.tool];
    for (const tool of tools) {
      assert(allowed.includes(tool), `Unsupported interactive tool: ${tool}`);
      results.push(await runInteractiveTool(tool, manifest, runDir, args));
    }
  } else {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }
  const blocking = hasBlockingResults(results);
  const report = { runId, mode: args.mode, tool: args.tool, manifest: path.relative(rootDir, manifestPath), startedAt, finishedAt: new Date().toISOString(), status: blocking ? 'attention-required' : 'pass', results };
  writeReports(runDir, report);
  console.log(`\nRoom foreman status: ${report.status}`);
  console.log(`Report: ${path.join(runDir, 'run-report.md')}`);
  if (blocking) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(error => {
  console.error(`Room foreman failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

export { buildQueue, fileToken, hasBlockingResults, parseAspectRatio, parseSize, readImageMetadata, validateImage, validateManifest, verifyAssets };
