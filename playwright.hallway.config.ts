import { defineConfig } from '@playwright/test';

// CI launches the real Wrangler Worker locally with synthetic test-only inputs.
// No provider deployment, production credentials or paid API calls.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'hallway-worker-preview.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:8799',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx wrangler dev --local --config wrangler.toml --ip 127.0.0.1 --port 8799 --var RECIPROCAL_DEFENSE_MODE:contain --var RECIPROCAL_DEFENSE_SECRET:hallway-preview-only',
    url: 'http://127.0.0.1:8799/health',
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
