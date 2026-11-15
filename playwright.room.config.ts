import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const sandboxChromium = '/opt/pw-browsers/chromium';
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (fs.existsSync(sandboxChromium) ? sandboxChromium : undefined);

export default defineConfig({
  testDir: './e2e/rooms',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report/rooms' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/rooms' }]],
  use: {
    baseURL: BASE_URL,
    ...devices['iPhone 13'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'room-contract-webkit-shape',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
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
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
      EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW: 'true',
    },
  },
});
