import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = path.resolve('scripts/verify-control-room-tests.mjs');

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sekret-control-room-tests-'));
  const workflowDir = path.join(root, '.github/workflows');
  await mkdir(workflowDir, { recursive: true });

  await writeFile(path.join(root, 'package.json'), JSON.stringify({
    scripts: {
      test: 'echo private-command-must-not-enter-report',
      'type-check': 'echo typecheck',
      deploy: 'echo deploy',
    },
  }, null, 2));

  await writeFile(path.join(root, 'control-room.manifest.json'), JSON.stringify({
    schemaVersion: '1.0',
    repository: 'jussray/Sekret-Bip',
    portfolioHub: 'jussray/founder-control-room',
    controlRoom: { privateContentAllowed: false },
    tests: {
      executionAuthority: 'exact-head-workflow-results',
      catalogIsPassEvidence: false,
      rawLogsAllowed: false,
      discovery: {
        includedPrefixes: ['test', 'type-check'],
        excludedPrefixes: ['deploy'],
      },
      criticalScripts: ['test', 'type-check'],
      workflowCatalog: [
        {
          id: 'required-gate',
          name: 'Required Gate',
          kind: 'contract',
          required: true,
          status: 'active',
        },
      ],
    },
  }, null, 2));

  await writeFile(path.join(workflowDir, 'required.yml'), 'name: Required Gate\non: workflow_dispatch\njobs: {}\n');
  await writeFile(path.join(workflowDir, 'additional.yml'), 'name: Additional Gate\non: workflow_dispatch\njobs: {}\n');

  return root;
}

function runVerifier(root, reportPath) {
  return execFileSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTROL_ROOM_REPOSITORY_ROOT: root,
      CONTROL_ROOM_TEST_REPORT_PATH: reportPath,
    },
    encoding: 'utf8',
  });
}

test('catalog inventories every matching script and named workflow without exposing commands', async () => {
  const root = await createFixture();
  const reportPath = path.join(root, 'artifacts', 'report.json');
  const stdout = runVerifier(root, reportPath);
  const report = JSON.parse(stdout);
  const retained = JSON.parse(await readFile(reportPath, 'utf8'));

  assert.equal(report.status, 'passed');
  assert.equal(report.truthBoundary, 'inventory-only-never-a-test-pass');
  assert.deepEqual(report.discovery.scripts, ['test', 'type-check']);
  assert.equal(report.workflows.discoveredCount, 2);
  assert.deepEqual(report.workflows.uncataloged, ['Additional Gate']);
  assert.equal(report.workflows.requiredCatalog[0].name, 'Required Gate');
  assert.equal(retained.status, 'passed');
  assert.doesNotMatch(JSON.stringify(report), /private-command-must-not-enter-report/);
});

test('catalog fails when a required workflow is missing', async () => {
  const root = await createFixture();
  await writeFile(path.join(root, '.github/workflows/required.yml'), 'name: Renamed Gate\non: workflow_dispatch\njobs: {}\n');

  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTROL_ROOM_REPOSITORY_ROOT: root,
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /required named workflow is missing: Required Gate/);
});

test('catalog fails on duplicate workflow names', async () => {
  const root = await createFixture();
  await writeFile(path.join(root, '.github/workflows/duplicate.yml'), 'name: Required Gate\non: workflow_dispatch\njobs: {}\n');

  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTROL_ROOM_REPOSITORY_ROOT: root,
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /workflow name is duplicated: Required Gate/);
});

test('catalog fails when the manifest tries to become pass evidence', async () => {
  const root = await createFixture();
  const manifestPath = path.join(root, 'control-room.manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.tests.catalogIsPassEvidence = true;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTROL_ROOM_REPOSITORY_ROOT: root,
    },
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /catalog must never be pass evidence/);
});
