#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const EXPECTED_NAV = ['Room', 'Pages', 'Calm', 'Circle', 'More'];
const DEFAULT_MANIFEST = 'config/room-production.manifest.json';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
const SAFE_NAME = /^[a-z][a-zA-Z0-9-]{0,63}$/;
const TOOLS = ['canva', 'figma', 'leonardo', 'app'];
const WORKSPACE_IMAGES = Object.freeze({
  canva: 'canva-workspace.png',
  figma: 'figma-workspace.png',
  leonardo: 'leonardo-workspace.png',
  app: 'app-workspace.png',
});
const CHECKPOINT_IMAGES = Object.freeze({
  canva: 'canva-checkpoint.png',
  figma: 'figma-checkpoint.png',
  leonardo: 'leonardo-checkpoint.png',
  app: 'app-checkpoint.png',
});

// All filesystem operations stay beneath the repository and reject symlink
// components. Never treat a CLI argument or manifest field as a trusted path.
export function safeProjectPath(...parts) {
  const resolved = path.resolve(ROOT, ...parts);
  const relative = path.relative(ROOT, resolved);
  assert(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    'Room foreman path escapes repository.');
  let candidate = ROOT;
  for (const part of relative.split(path.sep)) {
    candidate = path.join(candidate, part);
    try {
      if (fs.lstatSync(candidate).isSymbolicLink()) throw new Error('Room foreman symlink target rejected.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return resolved;
}

export function resolveManifestPath(requested) {
  assert(typeof requested === 'string' && requested.length > 0, 'Manifest path required.');
  const resolved = path.resolve(ROOT, requested);
  const relative = path.relative(ROOT, resolved).split(path.sep).join('/');
  assert(/^config\/room-production(?:\.[a-z0-9-]+)?\.json$/.test(relative),
    'Only repository-owned room-production manifests are allowed.');
  return safeProjectPath(relative);
}

function safeName(value) {
  assert(typeof value === 'string' && SAFE_NAME.test(value), 'Invalid room production identifier.');
  return value;
}

function safeRunId(value) {
  assert(typeof value === 'string' && RUN_ID.test(value), 'Invalid room foreman run id.');
  return value;
}

function reportPath(runId, name) {
  safeRunId(runId);
  assert(name === 'run-report.json' || name === 'run-report.md', 'Invalid report name.');
  return safeProjectPath('.room-foreman', 'runs', runId, name);
}

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST,
    mode: 'plan',
    tool: 'all',
    headless: false,
    holdMs: 15_000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--mode') args.mode = argv[++i];
    else if (arg === '--tool') args.tool = argv[++i];
    else if (arg === '--headless') args.headless = true;
    else if (arg === '--hold-ms') args.holdMs = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function usage() {
  console.log('ROOM_FOREMAN_HELP_SEE_ROOM_PRODUCTION_ENGINE_DOC');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateManifest(manifest) {
  assert(manifest.schemaVersion === 1, 'Unsupported room manifest schemaVersion.');
  assert(manifest.repository === 'jussray/Sekret-Bip', 'Manifest repository mismatch.');
  assert(Array.isArray(manifest.policies?.bottomNavigation), 'Missing bottom-navigation contract.');
  assert(
    JSON.stringify(manifest.policies.bottomNavigation) === JSON.stringify(EXPECTED_NAV),
    `Bottom navigation must remain exactly: ${EXPECTED_NAV.join(', ')}`,
  );
  assert(manifest.policies.bottomNavigationLocked === true, 'Bottom navigation must be locked.');
  assert(manifest.policies.userRoomOwnsDashboardCards === true, 'User Room must own dashboard/update cards.');
  assert(manifest.policies.companionRoomsRejectDashboardCards === true, 'Companion rooms must reject dashboard cards.');
  assert(manifest.policies.companionRoomsArePermanentDestinations === true, 'Companion rooms must remain permanent destinations.');
  assert(manifest.rooms?.night?.verticalSlice === true, 'Night must remain the first vertical slice.');

  assert(Array.isArray(manifest.phases) && manifest.phases.length > 0, 'Missing room phases.');
  for (const phase of manifest.phases) safeName(phase);

  for (const [id, character] of Object.entries(manifest.characters ?? {})) {
    safeName(id);
    for (const pose of character.requiredPoses ?? []) safeName(pose);
    assert(character.canonicalMaster, `${id} is missing canonicalMaster.`);
    assert(Array.isArray(character.requiredPoses) && character.requiredPoses.length > 0, `${id} has no pose queue.`);
  }

  for (const [id, room] of Object.entries(manifest.rooms ?? {})) {
    safeName(id);
    assert(room.baseAsset, `${id} room is missing baseAsset.`);
    assert(Array.isArray(room.anchors) && room.anchors.includes(room.defaultAnchor), `${id} defaultAnchor is invalid.`);
  }
}

function buildQueue(manifest) {
  const queue = [];

  for (const [characterId, character] of Object.entries(manifest.characters)) {
    for (const pose of character.requiredPoses) {
      queue.push({ kind: 'character-pose', characterId, pose, source: character.canonicalMaster });
    }
  }

  for (const [roomId, room] of Object.entries(manifest.rooms)) {
    for (const phase of manifest.phases) {
      queue.push({ kind: 'room-phase', roomId, phase, source: room.baseAsset });
    }
  }

  return queue;
}

function fileToken(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

export function runtimeOutputFor(item) {
  assert(item && typeof item === 'object', 'Missing room production job.');
  if (item.kind === 'character-pose') {
    const characterId = safeName(item.characterId);
    const pose = fileToken(safeName(item.pose));
    const output = path.join('assets', 'images', 'companions', characterId, `${characterId}-${pose}.png`);
    safeProjectPath(output);
    return output;
  }
  assert(item.kind === 'room-phase', 'Unsupported room production job.');
  const roomId = safeName(item.roomId);
  const phase = fileToken(safeName(item.phase));
  const output = path.join('assets', 'images', 'resized-bg', `bg-${roomId}-room-${phase}.jpg`);
  safeProjectPath(output);
  return output;
}

function writeReports(runDir, report) {
  const runId = safeRunId(report.runId);
  assert(runDir === safeProjectPath('.room-foreman', 'runs', runId), 'Invalid report directory.');
  fs.mkdirSync(runDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(reportPath(runId, 'run-report.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });

  const markdown = [
    '# Room Foreman Run',
    '',
    `- Run: ${report.runId}`,
    `- Mode: ${report.mode}`,
    `- Status: ${report.status}`,
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    '',
    '## Results',
    ...report.results.map(result => `- ${result.status.toUpperCase()} — ${result.label}${result.detail ? `: ${result.detail}` : ''}`),
    '',
  ].join('\n');

  fs.writeFileSync(reportPath(runId, 'run-report.md'), markdown, { flag: 'wx', mode: 0o600 });
}

function resolveWorkspaceUrl(tool, manifest) {
  if (tool === 'canva') return manifest.creativeTools.canva.editUrl;
  if (tool === 'figma') return process.env[manifest.creativeTools.figma.workspaceUrlEnv] ?? '';
  if (tool === 'leonardo') return process.env[manifest.creativeTools.leonardo.workspaceUrlEnv] ?? '';
  if (tool === 'app') return process.env.ROOM_FOREMAN_APP_URL ?? 'http://127.0.0.1:4173/(teen)/room';
  return '';
}

async function runInteractiveTool(tool, manifest, runDir, args) {
  assert(TOOLS.includes(tool), 'Unsupported interactive tool.');
  const runId = safeRunId(path.basename(runDir));
  assert(runDir === safeProjectPath('.room-foreman', 'runs', runId), 'Invalid evidence directory.');
  const url = resolveWorkspaceUrl(tool, manifest);
  if (!url) {
    return { status: 'blocked', label: tool, detail: 'Workspace URL environment variable is not configured.' };
  }

  const profileDir = safeProjectPath('.room-foreman', 'profiles', tool);
  const evidenceDir = safeProjectPath('.room-foreman', 'runs', runId, 'evidence');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: args.headless,
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.screenshot({ path: safeProjectPath('.room-foreman', 'runs', runId, 'evidence', WORKSPACE_IMAGES[tool]), fullPage: true });

    if (!args.headless && args.holdMs > 0) {
      console.log('ROOM_FOREMAN_INTERACTIVE_WORKSPACE_OPEN');
      await page.waitForTimeout(args.holdMs);
      await page.screenshot({ path: safeProjectPath('.room-foreman', 'runs', runId, 'evidence', CHECKPOINT_IMAGES[tool]), fullPage: true });
    }

    return { status: 'captured', label: tool, detail: `Evidence saved under ${evidenceDir}.` };
  } finally {
    await context.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const manifestPath = resolveManifestPath(args.manifest);
  const manifest = readJson(manifestPath);
  validateManifest(manifest);

  const runId = safeRunId(new Date().toISOString().replace(/[:.]/g, '-'));
  const runDir = safeProjectPath('.room-foreman', 'runs', runId);
  const startedAt = new Date().toISOString();
  const results = [];
  const queue = buildQueue(manifest);

  if (args.mode === 'plan') {
    results.push({ status: 'pass', label: 'manifest', detail: `${queue.length} production jobs validated.` });
    for (const item of queue) {
      results.push({ status: 'planned', label: runtimeOutputFor(item), detail: item.kind });
    }
  } else if (args.mode === 'verify') {
    for (const item of queue) {
      const output = runtimeOutputFor(item);
      const exists = fs.existsSync(safeProjectPath(output));
      results.push({ status: exists ? 'pass' : 'missing', label: output, detail: item.kind });
    }
  } else if (args.mode === 'interactive') {
    const tools = args.tool === 'all' ? TOOLS : [args.tool];
    for (const tool of tools) {
      assert(TOOLS.includes(tool), 'Unsupported interactive tool.');
      results.push(await runInteractiveTool(tool, manifest, runDir, args));
    }
  } else {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }

  const blocking = results.some(result => ['missing', 'blocked', 'fail'].includes(result.status));
  const report = {
    runId,
    mode: args.mode,
    tool: args.tool,
    manifest: path.relative(process.cwd(), manifestPath),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: blocking ? 'attention-required' : 'pass',
    results,
  };

  writeReports(runDir, report);
  if (blocking) console.error('ROOM_FOREMAN_ATTENTION_REQUIRED');
  else console.log('ROOM_FOREMAN_REPORT_WRITTEN');

  if (args.mode === 'verify' && blocking) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(() => {
  // Do not surface provider, path, or credential-shaped content through CI logs.
  console.error('ROOM_FOREMAN_EXECUTION_FAILED');
  process.exitCode = 1;
});
