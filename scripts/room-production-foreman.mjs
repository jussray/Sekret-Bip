#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const EXPECTED_NAV = ['Room', 'Pages', 'Calm', 'Circle', 'More'];
const DEFAULT_MANIFEST = 'config/room-production.manifest.json';

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

  for (const [id, character] of Object.entries(manifest.characters ?? {})) {
    assert(character.canonicalMaster, `${id} is missing canonicalMaster.`);
    assert(Array.isArray(character.requiredPoses) && character.requiredPoses.length > 0, `${id} has no pose queue.`);
  }

  for (const [id, room] of Object.entries(manifest.rooms ?? {})) {
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

function runtimeOutputFor(item) {
  if (item.kind === 'character-pose') {
    const pose = fileToken(item.pose);
    return path.join('assets', 'images', 'companions', item.characterId, `${item.characterId}-${pose}.png`);
  }

  const phase = fileToken(item.phase);
  return path.join('assets', 'images', 'resized-bg', `bg-${item.roomId}-room-${phase}.jpg`);
}

function writeReports(runDir, report) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'run-report.json'), `${JSON.stringify(report, null, 2)}\n`);

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
  if (!url) {
    return { status: 'blocked', label: tool, detail: 'Workspace URL environment variable is not configured.' };
  }

  const profileDir = path.resolve('.room-foreman', 'profiles', tool);
  const evidenceDir = path.join(runDir, 'evidence');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(evidenceDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: args.headless,
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.screenshot({ path: path.join(evidenceDir, `${tool}-workspace.png`), fullPage: true });

    if (!args.headless && args.holdMs > 0) {
      console.log('ROOM_FOREMAN_INTERACTIVE_WORKSPACE_OPEN');
      await page.waitForTimeout(args.holdMs);
      await page.screenshot({ path: path.join(evidenceDir, `${tool}-checkpoint.png`), fullPage: true });
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

  const manifestPath = path.resolve(args.manifest);
  const manifest = readJson(manifestPath);
  validateManifest(manifest);

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.resolve('.room-foreman', 'runs', runId);
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
      const exists = fs.existsSync(output);
      results.push({ status: exists ? 'pass' : 'missing', label: output, detail: item.kind });
    }
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

main().catch(error => {
  // Do not surface provider, path, or credential-shaped content through CI logs.
  console.error('ROOM_FOREMAN_EXECUTION_FAILED');
  process.exitCode = 1;
});
