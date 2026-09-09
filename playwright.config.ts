import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { resolvePlaywrightExecutablePath } from './scripts/playwright-executable.mjs';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const executablePath = resolvePlaywrightExecutablePath();
const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR
  ? path.resolve(process.env.PLAYWRIGHT_ARTIFACT_DIR)
  : null;

export default defineConfig({
  testDir: './e2e',
  testIgnore: [
    '**/production-smoke.spec.ts',
    '**/production-password-recovery.spec.ts',
    '**/production-auth-reachability.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: artifactDir
    ? [
        ['line'],
        ['json', { outputFile: path.join(artifactDir, 'results.json') }],
        ['html', { open: 'never', outputFolder: path.join(artifactDir, 'html') }],
      ]
    : process.env.CI
      ? [['line'], ['html', { open: 'never' }]]
      : 'html',
  outputDir: artifactDir ? path.join(artifactDir, 'test-results') : undefined,
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
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    },
  },
});
