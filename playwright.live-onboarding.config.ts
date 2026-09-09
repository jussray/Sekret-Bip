import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightExecutablePath } from './scripts/playwright-executable.mjs';

const BASE_URL =
  process.env.LIVE_ONBOARDING_BASE_URL ||
  process.env.PRODUCTION_BASE_URL ||
  'https://sekretbip.net';
const executablePath = resolvePlaywrightExecutablePath();

export default defineConfig({
  testDir: './e2e',
  testMatch: ['live-onboarding-email.spec.ts'],
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report-live-onboarding' }]]
    : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          args: ['--no-proxy-server'],
        },
      },
    },
  ],
});
