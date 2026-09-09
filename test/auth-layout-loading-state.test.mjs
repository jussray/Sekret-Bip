import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const layoutPath = path.join(process.cwd(), 'app', '(auth)', '_layout.tsx');

test('auth signup gate renders a visible accessible loading state', async () => {
  const source = await readFile(layoutPath, 'utf8');

  assert.doesNotMatch(
    source,
    /signupGateState\s*===\s*['"]checking['"]\)\s*return\s+null/,
    'the signup gate must never leave the user on a blank screen',
  );
  assert.match(source, /ActivityIndicator/);
  assert.match(source, /Getting sign-up ready/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityRole="progressbar"/);
});
