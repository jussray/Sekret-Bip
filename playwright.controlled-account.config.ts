import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightExecutablePath } from './scripts/playwright-executable.mjs';

const baseURL = process.env.SEKRET_CONTROLLED_ACCOUNT_BASE_URL || 'https://sekretbip.net';
const executablePath = resolvePlaywrightExecutablePath();

export default defineConfig({
  testDir: './e2e',
  testMatch: ['controlled-account-cloud-comfort.spec.ts'],
  timeout: 150_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
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
