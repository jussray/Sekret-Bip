import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {resolveWorkerReleaseSha, writeWorkerReleaseIdentity} from '../scripts/write-worker-release-identity.mjs';

const SHA = '45800cacabc531968d7dcaaa5ec505a66ef68ad1';

test('Workers Builds SHA is the build-time runtime identity authority', () => {
  assert.equal(resolveWorkerReleaseSha({WORKERS_CI_COMMIT_SHA: SHA}), SHA);
  assert.throws(
    () => resolveWorkerReleaseSha({WORKERS_CI_COMMIT_SHA: 'not-a-sha'}),
    /exact 40-character Git commit SHA/,
  );
});

test('runtime identity stamper writes the exact Workers Builds SHA', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-worker-release-'));
  const outputPath = path.join(dir, 'release-identity.generated.ts');
  const written = writeWorkerReleaseIdentity({env: {WORKERS_CI_COMMIT_SHA: SHA}, outputPath});
  assert.equal(written, SHA);
  assert.match(fs.readFileSync(outputPath, 'utf8'), new RegExp(SHA));
});

test('canonical Worker exposes baked SHA independently of Cloudflare version metadata', () => {
  const wrangler = fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8');
  const voiceEntry = fs.readFileSync(new URL('../worker/voice-entry.ts', import.meta.url), 'utf8');
  const verifier = fs.readFileSync(new URL('../scripts/verify-cloudflare-native-deploy.mjs', import.meta.url), 'utf8');

  assert.match(wrangler, /^main = "worker\/voice-entry\.ts"$/m);
  assert.match(wrangler, /^\[build\]$/m);
  assert.match(wrangler, /^command = "node scripts\/write-worker-release-identity\.mjs"$/m);

  assert.ok(voiceEntry.includes("import { WORKER_RELEASE_SHA } from './release-identity.generated';"));
  assert.ok(voiceEntry.includes('releaseSha: WORKER_RELEASE_SHA'));
  assert.equal(voiceEntry.includes('tag: version.tag ?? WORKER_RELEASE_SHA'), false);

  assert.ok(verifier.includes('health?.releaseSha'));
  assert.ok(verifier.includes('worker-release-sha-missing'));
  assert.ok(verifier.includes('worker-release-sha-stale'));

  assert.ok(workflow.includes('node scripts/verify-cloudflare-native-deploy.mjs'));
  assert.ok(workflow.includes('node scripts/publish-production-release-observation.mjs'));
});
