import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspaceRoot = path.join(root, 'src', 'features', 'control-room', 'workspace');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const workspaceFiles = [
  'src/features/control-room/workspace/types.ts',
  'src/features/control-room/workspace/BlockedThreadCard.tsx',
  'src/features/control-room/workspace/PRDependencyRail.tsx',
  'src/features/control-room/workspace/ThreadBoard.tsx',
  'src/features/control-room/workspace/ThreadDetailPane.tsx',
];

const workspaceSource = workspaceFiles.map(read).join('\n');
// The only currently-registered active Control Room panels (see
// src/screens/DevControlRoomScreen.tsx's imports); there is no active
// ThreadBoardPanel.tsx — that file has never existed in this repository.
const workerPanel = read('src/features/control-room/WorkerPanel.tsx');
const guardianReviewsPanel = read('src/features/control-room/GuardianReviewsPanel.tsx');
const promptOsPanel = read('src/features/control-room/PromptOsPanel.tsx');
const devControlRoom = read('src/screens/DevControlRoomScreen.tsx');
const devControlRoomWorkspace = read('src/screens/DevControlRoomWorkspace.tsx');

test('workspace preview files exist as an additive isolated directory', () => {
  assert.equal(fs.existsSync(workspaceRoot), true);
  for (const relativePath of workspaceFiles) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
  }
});

test('workspace preview has no network, Supabase, or external mutation path', () => {
  assert.doesNotMatch(workspaceSource, /getSupabase|createClient|\.rpc\s*\(|fetch\s*\(|axios\b/i);
  assert.doesNotMatch(workspaceSource, /wrangler|supabase\s+db|deploy\s*\(|publish\s*\(/i);
  assert.doesNotMatch(workspaceSource, /onApprove|onReject|onHold|handleApprove|handleReject|handleHold/);
});

test('workspace preview cannot manufacture approved or applied state', () => {
  const types = read('src/features/control-room/workspace/types.ts');
  const board = read('src/features/control-room/workspace/ThreadBoard.tsx');
  assert.doesNotMatch(types, /\|\s*'approved'|\|\s*'applied'/);
  assert.doesNotMatch(board, /status:\s*'approved'|status:\s*'applied'/);
  assert.match(workspaceSource, /READ-ONLY/);
  assert.match(workspaceSource, /issue #512/i);
});

test('workspace preview is not registered into active Control Room panels', () => {
  for (const activeSource of [
    workerPanel,
    guardianReviewsPanel,
    promptOsPanel,
    devControlRoom,
    devControlRoomWorkspace,
  ]) {
    assert.doesNotMatch(activeSource, /control-room\/workspace|workspace\/ThreadBoard/);
  }
});
