import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  isTrackedDesignPath,
  loadImplementationLedger,
  validateChangedDesignFiles,
  validateImplementationLedger,
} from '../scripts/verify-implementation-ledger.mjs';

function withTempRepo(run) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-ledger-'));
  try {
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'test'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'contract.ts'), 'export const contract = true;\n');
    fs.writeFileSync(path.join(rootDir, 'src', 'runtime.ts'), 'export const runtime = true;\n');
    fs.writeFileSync(path.join(rootDir, 'src', 'telemetry.ts'), 'export const telemetry = true;\n');
    fs.writeFileSync(path.join(rootDir, 'test', 'feature.test.mjs'), 'export {};\n');
    fs.writeFileSync(path.join(rootDir, 'test', 'feature.e2e.mjs'), 'export {};\n');
    fs.writeFileSync(path.join(rootDir, 'docs', 'ARCHITECTURE.md'), '# Architecture\n');
    fs.writeFileSync(path.join(rootDir, 'rollout.toml'), 'FEATURE = "disabled"\n');
    return run(rootDir);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
}

function baseFeature(overrides = {}) {
  return {
    id: 'example-feature',
    name: 'Example feature',
    status: 'integrated',
    ownerIssue: 'https://github.com/jussray/Sekret-Bip/issues/357',
    acceptanceCriteria: ['A user can complete the path.', 'A denial test proves isolation.'],
    contractPaths: ['src/contract.ts'],
    runtimePaths: ['src/runtime.ts'],
    testPaths: ['test/feature.test.mjs'],
    telemetryPaths: ['src/telemetry.ts'],
    rollout: {
      state: 'disabled',
      controlPath: 'rollout.toml',
      controlKey: 'FEATURE',
    },
    verification: {
      state: 'blocked',
      evidence: 'https://github.com/jussray/Sekret-Bip/issues/357',
      blocker: 'Waiting on a controlled deployment.',
    },
    rollback: 'Disable the rollout flag and revert the deployment.',
    ...overrides,
  };
}

function ledger(features) {
  return {
    schemaVersion: 1,
    updatedAt: '2026-07-12',
    statusOrder: ['planned', 'contract', 'integrated', 'verified', 'released'],
    features,
  };
}

test('accepts an integrated feature with runtime, tests, telemetry, rollout, and rollback evidence', () => {
  withTempRepo((rootDir) => {
    assert.deepEqual(validateImplementationLedger(ledger([baseFeature()]), { rootDir }), []);
  });
});

test('rejects an integrated feature that has no runtime evidence', () => {
  withTempRepo((rootDir) => {
    const errors = validateImplementationLedger(
      ledger([baseFeature({ runtimePaths: [] })]),
      { rootDir },
    );
    assert.equal(errors.some((error) => error.includes('runtimePaths')), true);
  });
});

test('rejects verified status without passed verification and executable user-path evidence', () => {
  withTempRepo((rootDir) => {
    const errors = validateImplementationLedger(
      ledger([baseFeature({ status: 'verified', e2ePaths: [] })]),
      { rootDir },
    );
    assert.equal(errors.some((error) => error.includes('e2ePaths')), true);
    assert.equal(errors.some((error) => error.includes('verification.state = passed')), true);
  });
});

test('accepts honest planned work without invented runtime paths', () => {
  withTempRepo((rootDir) => {
    const planned = baseFeature({
      id: 'planned-feature',
      status: 'planned',
      contractPaths: undefined,
      runtimePaths: undefined,
      testPaths: undefined,
      telemetryPaths: undefined,
      rollout: undefined,
      rollback: undefined,
      verification: {
        state: 'not-run',
        evidence: 'https://github.com/jussray/Sekret-Bip/issues/357',
        blocker: 'Not implemented yet.',
      },
    });
    assert.deepEqual(validateImplementationLedger(ledger([planned]), { rootDir }), []);
  });
});

test('loads validated feature extensions without rewriting the base ledger', () => {
  withTempRepo((rootDir) => {
    fs.writeFileSync(
      path.join(rootDir, 'implementation-ledger.json'),
      JSON.stringify(ledger([baseFeature()]), null, 2),
    );
    fs.mkdirSync(path.join(rootDir, 'implementation-ledger.extensions'), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'implementation-ledger.extensions', 'extra.json'),
      JSON.stringify({ features: [baseFeature({ id: 'extension-feature' })] }, null, 2),
    );

    const combined = loadImplementationLedger({ rootDir });
    assert.equal(combined.features.length, 2);
    assert.equal(combined.features[1].id, 'extension-feature');
    assert.deepEqual(validateImplementationLedger(combined, { rootDir }), []);
  });
});

test('tracks architecture, roadmap, sprint, and agent-skill documents', () => {
  assert.equal(isTrackedDesignPath('docs/CONTROL_ROOM_ARCHITECTURE.md'), true);
  assert.equal(isTrackedDesignPath('docs/COMPANION_ENGINE_DESIGN.md'), true);
  assert.equal(isTrackedDesignPath('SPRINT.md'), true);
  assert.equal(isTrackedDesignPath('.agents/skills/bip-l4-memory/SKILL.md'), true);
  assert.equal(isTrackedDesignPath('docs/legal/privacy-policy.md'), false);
});

test('requires ledger evidence when tracked design files change', () => {
  const errors = validateChangedDesignFiles([
    'docs/CONTROL_ROOM_ARCHITECTURE.md',
    'worker/sekret-reply.ts',
  ]);
  assert.equal(errors.length > 0, true);

  assert.deepEqual(validateChangedDesignFiles([
    'docs/CONTROL_ROOM_ARCHITECTURE.md',
    'implementation-ledger.json',
  ]), []);

  assert.deepEqual(validateChangedDesignFiles([
    'docs/CONTROL_ROOM_ARCHITECTURE.md',
    'implementation-ledger.extensions/humane-retention-loops.json',
  ]), []);
});
