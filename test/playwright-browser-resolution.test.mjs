import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  PLAYWRIGHT_CHROMIUM_FALLBACKS,
  choosePlaywrightExecutablePath,
} from '../scripts/playwright-executable.mjs';

const configs = [
  'playwright.config.ts',
  'playwright.config.mjs',
  'playwright.production.config.ts',
  'playwright.founder-preview.config.ts',
  'playwright.live-onboarding.config.ts',
  'playwright.founder-operator.config.ts',
  'playwright.controlled-account.config.ts',
];

const automaticallyTriggeredConsumers = [
  '.github/workflows/product-design-playwright-proof.yml',
  '.github/workflows/comfort-mode-gate.yml',
  '.github/workflows/cloud-thoughts-gate.yml',
  '.github/workflows/front-door-gate.yml',
  '.github/workflows/production-gate-contract.yml',
  '.github/workflows/deploy-cloudflare.yml',
  '.github/workflows/controlled-account-cloud-comfort.yml',
  '.github/workflows/founder-operator-exact-head.yml',
  '.github/workflows/live-signup-proof.yml',
];

const resolverPath = 'scripts/playwright-executable.mjs';

test('all Playwright configs use the shared browser resolver', async () => {
  for (const configPath of configs) {
    const source = await readFile(new URL(`../${configPath}`, import.meta.url), 'utf8');
    assert.match(source, /resolvePlaywrightExecutablePath/);
    assert.doesNotMatch(source, /sandboxChromium/);
  }
});

test('every automatic consumer watches the shared resolver', async () => {
  for (const workflowPath of automaticallyTriggeredConsumers) {
    const source = await readFile(new URL(`../${workflowPath}`, import.meta.url), 'utf8');
    assert.match(
      source,
      /scripts\/playwright-executable\.mjs/,
      `${workflowPath} must run when ${resolverPath} changes`,
    );
  }
});

test('explicit browser override remains highest authority', () => {
  const resolved = choosePlaywrightExecutablePath({
    explicitPath: '/custom/chromium',
    managedPath: '/managed/chromium',
    exists: () => true,
  });
  assert.equal(resolved, '/custom/chromium');
});

test('installed version-matched Playwright browser wins over host fallbacks', () => {
  const existing = new Set(['/managed/chromium', ...PLAYWRIGHT_CHROMIUM_FALLBACKS]);
  const resolved = choosePlaywrightExecutablePath({
    managedPath: '/managed/chromium',
    exists: (candidate) => existing.has(candidate),
  });
  assert.equal(resolved, '/managed/chromium');
});

test('host fallback is used only when Playwright-managed browser is unavailable', () => {
  const existing = new Set(['/usr/bin/chromium']);
  const resolved = choosePlaywrightExecutablePath({
    managedPath: '/managed/missing',
    exists: (candidate) => existing.has(candidate),
  });
  assert.equal(resolved, '/usr/bin/chromium');
});

test('no override leaves browser selection to Playwright when no managed browser or fallback exists', () => {
  const resolved = choosePlaywrightExecutablePath({
    managedPath: '/managed/missing',
    exists: () => false,
  });
  assert.equal(resolved, undefined);
});
