import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightExecutablePath } from './scripts/playwright-executable.mjs';

const PORT = 4176;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const executablePath = resolvePlaywrightExecutablePath();
const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR
  ? path.resolve(process.env.PLAYWRIGHT_ARTIFACT_DIR)
  : path.resolve('reports/control-room/playwright/founder-operator');

export default defineConfig({
  testDir: './e2e-founder-operator',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['line'],
    ['json', { outputFile: path.join(artifactDir, 'results.json') }],
    ['html', { open: 'never', outputFolder: path.join(artifactDir, 'html') }],
  ],
  outputDir: path.join(artifactDir, 'test-results'),
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
      EXPO_PUBLIC_SUPABASE_URL: 'https://founder-operator-test.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key-not-a-secret',
    },
  },
});
