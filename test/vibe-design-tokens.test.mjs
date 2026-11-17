import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('six canonical vibe token sets remain present', async () => {
  const source = await read('constants/vibeDesignTokens.ts');
  for (const key of ['raylene', 'rylane', 'cloud', 'night', 'rain', 'sunset']) {
    assert.match(source, new RegExp(`${key}: createVibe`));
  }
});

test('global privacy, verification, safety, and parent boundaries remain invariant', async () => {
  const source = await read('constants/vibeDesignTokens.ts');
  for (const key of ['safety:', 'privacy:', 'parentBoundary:', 'verification:']) {
    assert.match(source, new RegExp(key));
  }
  assert.match(source, /#FFF3F3/);
  assert.match(source, /#E8F5FA/);
  assert.match(source, /#FFFBE6/);
  assert.match(source, /#E8FAF4/);
});

test('night remains the only dark-surface token set', async () => {
  const source = await read('constants/vibeDesignTokens.ts');
  const matches = source.match(/isDarkSurface: true/g) ?? [];
  assert.equal(matches.length, 1);
  assert.match(source, /vibeKey: 'night'/);
});
