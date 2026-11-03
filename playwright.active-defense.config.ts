import { networkInterfaces } from 'node:os';
import { defineConfig } from '@playwright/test';

const PORT = 8799;
const LOOPBACK = Object.values(networkInterfaces()).flat().find((address) => address?.internal === true && address.family === 'IPv4')?.address;
if (!LOOPBACK) throw new Error('active_defense_internal_network_unavailable');
const BASE_URL = `https://${LOOPBACK}:${PORT}`;
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
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx wrangler dev --local --local-protocol=https --ip ${LOOPBACK} --port ${PORT} --var ACTIVE_DEFENSE_MODE:contain --var ACTIVE_DEFENSE_HMAC_KEY:${TEST_KEY}`,
    url: `${BASE_URL}/.env`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
