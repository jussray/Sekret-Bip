import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Static contract: verifies the production theme compatibility mapping without
// requiring Expo/React Native modules in the Node test runner.
const source = readFileSync(new URL('../src/constants/theme.ts', import.meta.url), 'utf8');
const body = source.match(/export function normalizeVibeKey\(raw: string \| undefined\): VibeKey \{([\s\S]*?)\n\}/)?.[1];

test('canonical and legacy companion IDs retain their existing room themes', () => {
  assert.ok(body, 'normalizeVibeKey must exist');
  assert.match(body, /raw === 'suhana' \|\| raw === 'raylene'\) return 'soft'/);
  assert.match(body, /raw === 'sy'\) return 'rylane'/);
  assert.match(body, /VALID_VIBE_KEYS\.includes/);
});
