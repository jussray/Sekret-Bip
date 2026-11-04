import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('native deployment verification uses the well-known release marker emitted by the web build', () => {
  const workflow = read('.github/workflows/deploy-cloudflare.yml');
  const writer = read('scripts/write-release-metadata.mjs');

  assert.match(
    workflow,
    /FRONTEND_RELEASE_URL: https:\/\/app\.sekretbip\.net\/\.well-known\/sekret-release\.json/,
  );
  assert.match(writer, /path\.join\(wellKnownDirectory, 'sekret-release\.json'\)/);
  assert.match(writer, /fs\.writeFileSync\(wellKnownDestination, serialized, 'utf8'\)/);
});

test('deployment verification language matches the Worker-hosted frontend topology', () => {
  const workflow = read('.github/workflows/deploy-cloudflare.yml');

  assert.match(workflow, /Verify exact frontend Worker, backend Worker, and release/);
  assert.match(workflow, /Wait for exact frontend and backend Worker checks plus release marker/);
  assert.doesNotMatch(workflow, /Wait for exact Worker check and Pages release marker/);
});
