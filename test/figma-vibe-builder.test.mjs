import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Figma plugin is local-only and networkless', async () => {
  const manifest = JSON.parse(await read('tools/figma-vibe-builder/manifest.json'));
  assert.equal(manifest.main, 'code.js');
  assert.deepEqual(manifest.editorType, ['figma']);
  assert.deepEqual(manifest.networkAccess.allowedDomains, ['none']);
});

test('Figma builder creates six 390x844 canonical frames', async () => {
  const source = await read('tools/figma-vibe-builder/code.js');
  assert.match(source, /const FRAME_W = 390/);
  assert.match(source, /const FRAME_H = 844/);
  for (const key of ['raylene', 'rylane', 'cloud', 'night', 'rain', 'sunset']) {
    assert.match(source, new RegExp(`key: '${key}'`));
  }
  assert.match(source, /for \(let i = 0; i < VIBES\.length; i \+= 1\)/);
});

test('generated frames include privacy, verification, Circle, and parent boundaries', async () => {
  const source = await read('tools/figma-vibe-builder/code.js');
  for (const label of ['Privacy Badge', 'Verification Badge', 'Circle Post Card', 'Parent Boundary']) {
    assert.match(source, new RegExp(label));
  }
});
