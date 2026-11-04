import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveManifestPath, runtimeOutputFor, safeProjectPath } from '../scripts/room-production-foreman.mjs';


const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

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
    path.join('assets', 'images', 'companions', 'night', 'night-moon-chair.png'));
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
