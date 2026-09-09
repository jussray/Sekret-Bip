import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { bootstrapReleaseMetadataSource } from '../scripts/bootstrap-release-metadata-source.mjs';

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const appConfig = fs.readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8');

function cloudflareEnv(overrides = {}) {
  return {
    CF_PAGES: '1',
    CF_PAGES_COMMIT_SHA: SHA.toUpperCase(),
    CF_PAGES_BRANCH: 'main',
    CF_PAGES_URL: 'https://deployment.pages.dev',
    CF_PAGES_DEPLOYMENT_ID: 'deployment-456',
    ...overrides,
  };
}

test('the authoritative Expo config invokes the Cloudflare source bootstrap', () => {
  assert.match(appConfig, /function prepareCloudflareReleaseSource\(\): void/);
  assert.match(appConfig, /process\.env\.CF_PAGES !== '1'/);
  assert.match(appConfig, /bootstrap-release-metadata-source\.mjs/);
  assert.match(appConfig, /execFileSync\(process\.execPath, \[scriptPath\]/);
  assert.match(appConfig, /prepareCloudflareReleaseSource\(\);/);
});

test('Cloudflare bootstrap writes exact public marker sources before Expo export', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-release-source-'));

  try {
    const result = bootstrapReleaseMetadataSource({
      cwd: directory,
      env: cloudflareEnv(),
      now: new Date('2026-08-06T03:20:00.000Z'),
    });

    const rootMarker = JSON.parse(fs.readFileSync(result.destination, 'utf8'));
    const wellKnownMarker = JSON.parse(fs.readFileSync(result.wellKnownDestination, 'utf8'));

    assert.equal(result.reused, false);
    assert.deepEqual(wellKnownMarker, rootMarker);
    assert.equal(result.destination, path.join(directory, 'public', 'release.json'));
    assert.equal(
      result.wellKnownDestination,
      path.join(directory, 'public', '.well-known', 'sekret-release.json'),
    );
    assert.equal(rootMarker.commitSha, SHA);
    assert.equal(rootMarker.branch, 'main');
    assert.equal(rootMarker.environment, 'production');
    assert.equal(rootMarker.deploymentProvider, 'cloudflare-pages');
    assert.equal(rootMarker.canonicalUrl, 'https://sekretbip.net');
    assert.equal(rootMarker.builtAt, '2026-08-06T03:20:00.000Z');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('repeated Expo config evaluation reuses one exact marker timestamp', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-release-reuse-'));

  try {
    const first = bootstrapReleaseMetadataSource({
      cwd: directory,
      env: cloudflareEnv(),
      now: new Date('2026-08-06T03:20:00.000Z'),
    });
    const firstContents = fs.readFileSync(first.destination, 'utf8');

    const second = bootstrapReleaseMetadataSource({
      cwd: directory,
      env: cloudflareEnv(),
      now: new Date('2026-08-06T04:20:00.000Z'),
    });

    assert.equal(first.reused, false);
    assert.equal(second.reused, true);
    assert.equal(second.metadata.builtAt, '2026-08-06T03:20:00.000Z');
    assert.equal(fs.readFileSync(second.destination, 'utf8'), firstContents);
    assert.equal(
      fs.readFileSync(second.wellKnownDestination, 'utf8'),
      firstContents,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('changed release identity replaces an existing marker source', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-release-replace-'));

  try {
    bootstrapReleaseMetadataSource({
      cwd: directory,
      env: cloudflareEnv(),
      now: new Date('2026-08-06T03:20:00.000Z'),
    });

    const changed = bootstrapReleaseMetadataSource({
      cwd: directory,
      env: cloudflareEnv({ CF_PAGES_DEPLOYMENT_ID: 'deployment-789' }),
      now: new Date('2026-08-06T04:20:00.000Z'),
    });

    assert.equal(changed.reused, false);
    assert.equal(changed.metadata.deploymentId, 'deployment-789');
    assert.equal(changed.metadata.builtAt, '2026-08-06T04:20:00.000Z');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('release-source bootstrap fails closed outside Cloudflare Pages', () => {
  assert.throws(
    () => bootstrapReleaseMetadataSource({ env: {}, cwd: process.cwd() }),
    /requires CF_PAGES=1/,
  );
});
