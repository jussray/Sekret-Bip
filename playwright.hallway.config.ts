import { networkInterfaces } from 'node:os';
import { defineConfig } from '@playwright/test';

// Only an OS-reported internal IPv4 interface may serve this isolated proof.
// The config is never imported by the deployed Worker; no public target accepted.
const loopback = Object.values(networkInterfaces())
  .flat()
  .find((address) => address?.internal === true && address.family === 'IPv4')
  ?.address;
if (!loopback) throw new Error('hallway_preview_internal_network_unavailable');
const previewOrigin = `http://${loopback}:8799`;

export default defineConfig({
  testDir: './e2e',
  testMatch: 'hallway-worker-preview.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['line'],
    ['json', { outputFile: 'artifacts/hallway-worker-preview/results.json' }],
  ],
  outputDir: 'artifacts/hallway-worker-preview/test-results',
  use: {
    baseURL: previewOrigin,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx wrangler dev --local --config wrangler.toml --ip ${loopback} --port 8799 --var RECIPROCAL_DEFENSE_MODE:contain --var RECIPROCAL_DEFENSE_SECRET:hallway-preview-only`,
    url: `${previewOrigin}/health`,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
