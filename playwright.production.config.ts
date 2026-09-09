import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightExecutablePath } from './scripts/playwright-executable.mjs';

// Se'kret Bip — anonymous, read-only browser verification against the live
// customer-facing application frontend. This suite intentionally sends no
// Cloudflare Access service-token headers: launch proof must match the path a
// normal parent, teen, or anonymous visitor can actually use.
const BASE_URL = process.env.PRODUCTION_BASE_URL || 'https://app.sekretbip.net';
const executablePath = resolvePlaywrightExecutablePath();

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'production-public-front-door.spec.ts',
    'production-smoke.spec.ts',
    'production-audience-journeys.spec.ts',
    'production-auth-reachability.spec.ts',
    'production-password-recovery.spec.ts',
    'production-signup-transport.spec.ts',
  ],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 2,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report-production' }]]
    : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
