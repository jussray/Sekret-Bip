import { defineConfig } from '@playwright/test';

const PORT = 8799;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_KEY = 'bip-playwright-active-defense-test-key-abcdefghijklmnopqrstuvwxyz';

export default defineConfig({
  testDir: './e2e-active-defense',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['line']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx wrangler dev --local --port ${PORT} --var ACTIVE_DEFENSE_MODE:contain --var ACTIVE_DEFENSE_HMAC_KEY:${TEST_KEY}`,
    url: `${BASE_URL}/.env`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
