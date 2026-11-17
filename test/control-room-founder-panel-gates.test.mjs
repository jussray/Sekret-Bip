import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertFounderGate(relativePath, lockedTitle, protectedMarker, { requiresManagement = false } = {}) {
  const src = read(relativePath);

  assert.match(src, /getCurrentFounderProfile/);
  assert.match(src, /useEffect\(\(\) => \{/);
  if (requiresManagement) {
    assert.match(src, /isWorkerManagementProfile/);
    assert.match(src, /setAuthorized\(isWorkerManagementProfile\(profile\)\)/);
    assert.doesNotMatch(src, /setAuthorized\(isFounderProfile\(profile\)\)/);
  } else {
    assert.match(src, /isFounderProfile/);
    assert.match(src, /setAuthorized\(isFounderProfile\(profile\)\)/);
  }
  assert.match(src, /authorized === null/);
  assert.match(src, /!authorized/);
  assert.match(src, new RegExp(lockedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(src, /Founder or admin access is required/);

  const lockedIndex = src.indexOf(lockedTitle);
  const protectedIndex = src.indexOf(protectedMarker);
  assert.ok(lockedIndex > -1, `${relativePath} should render locked copy`);
  assert.ok(protectedIndex > -1, `${relativePath} should still contain protected content`);
  assert.ok(
    lockedIndex < protectedIndex,
    `${relativePath} should return the locked state before rendering protected content`,
  );
}

test('Prompt OS panel is gated before founder-only prompt content renders', () => {
  assertFounderGate(
    'src/features/control-room/PromptOsPanel.tsx',
    'Prompt OS is locked.',
    'Search Bip prompts',
  );
});

test('Worker panel is gated before live Worker controls render', () => {
  assertFounderGate(
    'src/features/control-room/WorkerPanel.tsx',
    'Worker Panel is locked.',
    'Fire Test Shot',
    { requiresManagement: true },
  );
});
