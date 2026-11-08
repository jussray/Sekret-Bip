import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Playwright guardrail and reply-safety specs are discovered independently', () => {
  const guardrails = readFileSync(new URL('../e2e/guardrails.spec.ts', import.meta.url), 'utf8');
  const replySafety = readFileSync(new URL('../e2e/reply-guard-safety.spec.ts', import.meta.url), 'utf8');

  // Playwright rejects a test file that imports another *.spec file.
  assert.doesNotMatch(
    guardrails,
    /^\s*import\s+['"][^'"]+\.spec(?:\.[cm]?[jt]sx?)?['"]\s*;?/m,
    'guardrails.spec.ts must not import a separate Playwright test file',
  );
  assert.match(guardrails, /test\(['"]installs the public-safe Se/);
  assert.match(replySafety, /test\(['"]Pages preserves explicit safety resources/);
});
