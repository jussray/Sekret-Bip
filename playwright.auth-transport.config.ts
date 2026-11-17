import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4175;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const sandboxChromium = '/opt/pw-browsers/chromium';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (fs.existsSync(sandboxChromium) ? sandboxChromium : undefined);

export default defineConfig({
  testDir: './e2e',
  testMatch: ['production-signup-transport.spec.ts'],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report-auth-transport' }]]
    : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // These values are deliberately fake and public. They only make the
      // Supabase browser client construct requests; the test intercepts every
      // /auth/v1/ request before it can reach a network destination.
      EXPO_PUBLIC_SUPABASE_URL: 'https://playwright.invalid',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'playwright-public-anon-key-not-a-secret',
    },
  },
});
