import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { inspectLegacyReport } from '../scripts/room-report-recovery.mjs';
import { registryBlock } from '../scripts/room-asset-verification.mjs';
import { resolveManifestPath, runtimeOutputFor, safeProjectPath } from '../scripts/room-production-foreman.mjs';


const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Night registry parses generated, fallback, and room-phase entries without losing main coverage', async () => {
  const registry = await read('src/config/nightRoomAssetRegistry.ts');
  const neutral = registryBlock(registry, 'NIGHT_ROOM_POSE_ASSETS', 'neutral');
  assert.equal(neutral.kind, 'object');
  assert.match(neutral.body, /generatedFile: canonicalFile/);
  assert.match(neutral.body, /status: 'generated'/);
  const thinking = registryBlock(registry, 'NIGHT_ROOM_POSE_ASSETS', 'thinking');
  assert.equal(thinking.kind, 'fallback-call');
  assert.match(thinking.body, /thinking: fallback\('assets\/images\/companions\/teen\/night\/thinking\.png'\)/);
  const day = registryBlock(registry, 'NIGHT_ROOM_PHASE_ASSETS', 'day');
  assert.equal(day.kind, 'object');
  assert.match(day.body, /file: 'assets\/images\/resized-bg\/bg-night-room-day\.jpg'/);
  assert.throws(() => registryBlock(registry, 'NIGHT_ROOM_POSE_ASSETS', 'missingPose'), /Registry is missing/);
  assert.throws(() => registryBlock(registry, 'NIGHT_ROOM_POSE_ASSETS', '../escape'), /Invalid room registry/);
});

test('default Playwright isolates rooms while CI executes the dedicated suite', async () => {
  const config = await read('playwright.config.ts');
  const workflow = await read('.github/workflows/playwright.yml');

  assert.match(config, /testDir: '\.\/e2e'/);
  assert.match(config, /'\*\*\/production-smoke\.spec\.ts'/);
  assert.match(config, /'\*\*\/rooms\/\*\*'/);
  assert.match(config, /playwright\.room\.config\.ts/);

  assert.match(workflow, /playwright\.room\.config\.ts/);
  assert.match(workflow, /test\/room-production-contract\.test\.mjs/);
  assert.match(workflow, /Run founder-preview room contract tests/);
  assert.match(workflow, /npm run test:e2e:rooms/);
});

test('Night required poses are fully represented in the Leonardo prompt pack', async () => {
  const manifest = JSON.parse(await read('config/room-production.manifest.json'));
  const promptPack = JSON.parse(await read('config/leonardo/night-asset-prompt-pack.json'));

  const required = new Set(manifest.characters.night.requiredPoses);
  const prompted = new Set(promptPack.poses.map((pose) => pose.id));

  for (const pose of required) {
    assert.equal(prompted.has(pose), true, `missing Night prompt for required pose: ${pose}`);
  }

  assert.equal(required.has('thinking'), true);
  assert.equal(required.has('moonChair'), true);
  assert.equal(prompted.has('thinking'), true);
  assert.equal(prompted.has('moonChair'), true);
});

test('room foreman normalizes camel-case IDs to canonical asset filenames', async () => {
  const foreman = await read('scripts/room-production-foreman.mjs');

  assert.match(foreman, /function fileToken\(value\)/);
  assert.match(foreman, /replace\(\/\(\[a-z0-9\]\)\(\[A-Z\]\)\/g, '\$1-\$2'\)/);
  assert.match(foreman, /const pose = fileToken\(safeName\(item\.pose\)\)/);
  assert.match(foreman, /const phase = fileToken\(safeName\(item\.phase\)\)/);
  assert.doesNotMatch(foreman, /\$\{item\.characterId\}-\$\{item\.pose\}\.png/);

  const fileToken = (value) => String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

  assert.equal(fileToken('moonChair'), 'moon-chair');
  assert.equal(fileToken('deepNight'), 'deep-night');
});

test('room production paths are project-bound and identifiers cannot traverse directories', () => {
  assert.ok(resolveManifestPath('config/room-production.manifest.json').endsWith('config/room-production.manifest.json'));
  assert.throws(() => resolveManifestPath('../outside.json'), /Only repository-owned/);
  assert.throws(() => resolveManifestPath('config/other-config.json'), /Only repository-owned/);
  assert.throws(() => safeProjectPath('..', 'untrusted'), /escapes repository/);
  assert.throws(() => runtimeOutputFor({ kind: 'character-pose', characterId: '../../private', pose: 'neutral' }), /Invalid room production identifier/);
  assert.throws(() => runtimeOutputFor({ kind: 'character-pose', characterId: 'night', pose: '../secret' }), /Invalid room production identifier/);
  assert.throws(() => runtimeOutputFor({ kind: 'room-phase', roomId: '../other', phase: 'night' }), /Invalid room production identifier/);
  assert.throws(() => runtimeOutputFor({ kind: 'room-phase', roomId: 'night', phase: '..\\bad' }), /Invalid room production identifier/);
  assert.throws(() => runtimeOutputFor({ kind: 'unknown', roomId: 'night', phase: 'day' }), /Unsupported room production job/);
  assert.equal(runtimeOutputFor({ kind: 'character-pose', characterId: 'night', pose: 'moonChair' }),
    path.join('assets', 'images', 'companions', 'teen', 'night', 'moon-chair.png'));
  assert.equal(runtimeOutputFor({ kind: 'room-phase', roomId: 'night', phase: 'deepNight' }),
    path.join('assets', 'images', 'resized-bg', 'bg-night-room-deep-night.jpg'));
});

test('room production path guard refuses symlink escapes', { skip: process.platform === 'win32' }, () => {
  const ignored = safeProjectPath('.room-foreman');
  fs.mkdirSync(ignored, { recursive: true });
  const local = fs.mkdtempSync(path.join(ignored, 'path-guard-test-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'room-guard-target-'));
  try {
    fs.symlinkSync(outside, path.join(local, 'escape'), 'dir');
    assert.throws(() => safeProjectPath('.room-foreman', path.basename(local), 'escape', 'secret.json'), /symlink target rejected/);
  } finally {
    fs.rmSync(local, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});


function inIsolatedRoomWorkspace(run) {
  const ignored = safeProjectPath('.room-foreman');
  fs.mkdirSync(ignored, { recursive: true });
  const root = fs.mkdtempSync(path.join(ignored, 'foreman-report-test-'));
  try {
    for (const relative of [
      'scripts/room-production-foreman.mjs',
      'scripts/room-asset-verification.mjs',
      'scripts/room-report-recovery.mjs',
      'config/room-production.manifest.json',
      'config/leonardo/night-asset-prompt-pack.json',
    ]) {
      const destination = path.join(root, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(safeProjectPath(...relative.split('/')), destination);
    }
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function createPlanReport(root) {
  const stdout = execFileSync(process.execPath, ['scripts/room-production-foreman.mjs', '--mode', 'plan'], {
    cwd: root, encoding: 'utf8', timeout: 30_000,
  });
  assert.match(stdout, /ROOM_FOREMAN_REPORT_WRITTEN/);
  const runs = path.join(root, '.room-foreman', 'runs');
  const runIds = fs.readdirSync(runs);
  assert.equal(runIds.length, 1, 'isolated plan mode must create exactly one run');
  return { runId: runIds[0], reportFile: path.join(runs, runIds[0], 'run-report.json') };
}

test('room foreman plan mode writes parseable JSON with a real trailing newline', () => {
  inIsolatedRoomWorkspace((root) => {
    const { runId, reportFile } = createPlanReport(root);
    const raw = fs.readFileSync(reportFile, 'utf8');
    assert.ok(raw.endsWith('}\n'), 'report must end with a real newline');
    assert.equal(raw.endsWith('\\n'), false, 'report must not end with a literal backslash-n');
    const report = JSON.parse(raw);
    assert.equal(report.runId, runId);
    assert.equal(report.mode, 'plan');
    assert.ok(Array.isArray(report.results));
    assert.ok(report.results.length > 0);
  });
});

test('legacy report recovery previews without mutation and applies only with a backup', () => {
  inIsolatedRoomWorkspace((root) => {
    const { runId, reportFile } = createPlanReport(root);
    const valid = fs.readFileSync(reportFile, 'utf8');
    const malformed = valid.slice(0, -1) + '\\n';
    fs.writeFileSync(reportFile, malformed);
    assert.throws(() => JSON.parse(malformed), SyntaxError);

    const command = ['scripts/room-report-recovery.mjs', '--run-id', runId];
    const options = { cwd: root, encoding: 'utf8', timeout: 30_000 };
    assert.match(execFileSync(process.execPath, command, options), /ROOM_FOREMAN_LEGACY_REPAIRABLE/);
    assert.equal(fs.readFileSync(reportFile, 'utf8'), malformed, 'preview must not mutate');
    assert.match(execFileSync(process.execPath, [...command, '--apply'], options), /ROOM_FOREMAN_LEGACY_REPAIRED/);
    assert.equal(fs.readFileSync(reportFile, 'utf8'), valid);
    assert.equal(fs.readFileSync(reportFile + '.legacy.bak', 'utf8'), malformed);
    assert.match(execFileSync(process.execPath, command, options), /ROOM_FOREMAN_REPORT_ALREADY_VALID/);
  });
});

test('legacy recovery rejects other corruption rather than guessing', () => {
  assert.throws(() => inspectLegacyReport('{"results": [}\\n'), /Unrecognized room report corruption/);
  assert.throws(() => inspectLegacyReport('not json'), /Unrecognized room report corruption/);
  assert.equal(inspectLegacyReport('{"results":[]}\n').status, 'valid');
});
