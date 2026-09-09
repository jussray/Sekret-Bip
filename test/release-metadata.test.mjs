import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  resolveReleaseMetadata,
  writeReleaseMetadata,
} from '../scripts/write-release-metadata.mjs';

test('Cloudflare Pages main builds resolve as production web releases', () => {
  const metadata = resolveReleaseMetadata({
    CF_PAGES: '1',
    CF_PAGES_COMMIT_SHA: 'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    CF_PAGES_BRANCH: 'main',
    CF_PAGES_URL: 'https://example.pages.dev',
    CF_PAGES_DEPLOYMENT_ID: 'deployment-123',
    GITHUB_SHA: '1111111111111111111111111111111111111111',
  }, process.cwd(), new Date('2026-07-13T01:00:00.000Z'));

  assert.deepEqual(metadata, {
    schemaVersion: 2,
    app: 'sekret-bip',
    surface: 'web-front-door',
    environment: 'production',
    commitSha: 'abcdef0123456789abcdef0123456789abcdef01',
    branch: 'main',
    deploymentProvider: 'cloudflare-pages',
    deploymentId: 'deployment-123',
    deploymentUrl: 'https://example.pages.dev',
    canonicalUrl: 'https://sekretbip.net',
    builtAt: '2026-07-13T01:00:00.000Z',
  });
});

test('non-main builds resolve as previews unless explicitly overridden', () => {
  const metadata = resolveReleaseMetadata({
    CF_PAGES: '1',
    CF_PAGES_COMMIT_SHA: '3333333333333333333333333333333333333333',
    CF_PAGES_BRANCH: 'feature/front-door',
    CF_PAGES_URL: 'https://preview.pages.dev',
  }, process.cwd(), new Date('2026-07-13T01:30:00.000Z'));

  assert.equal(metadata.environment, 'preview');
  assert.equal(metadata.canonicalUrl, null);
  assert.equal(metadata.surface, 'web-front-door');
});

test('GitHub exact-head builds stamp the checked-out commit instead of the synthetic pull-request merge SHA', () => {
  const checkedOutHead = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim().toLowerCase();

  const metadata = resolveReleaseMetadata({
    GITHUB_SHA: '9999999999999999999999999999999999999999',
    GITHUB_HEAD_REF: 'fix/exact-head-release-metadata',
    GITHUB_REF_NAME: '776/merge',
    GITHUB_RUN_ID: 'run-456',
  }, process.cwd(), new Date('2026-08-09T18:45:00.000Z'));

  assert.equal(metadata.commitSha, checkedOutHead);
  assert.equal(metadata.branch, 'fix/exact-head-release-metadata');
  assert.equal(metadata.deploymentProvider, 'local-or-ci-build');
  assert.equal(metadata.environment, 'preview');
});

test('writes identical public release manifests into both supported paths', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-release-'));
  try {
    const result = writeReleaseMetadata('dist', {
      cwd: directory,
      env: {
        GITHUB_SHA: '2222222222222222222222222222222222222222',
        GITHUB_REF_NAME: 'test-branch',
      },
      now: new Date('2026-07-13T02:00:00.000Z'),
    });
    const rootManifest = JSON.parse(fs.readFileSync(result.destination, 'utf8'));
    const wellKnownManifest = JSON.parse(fs.readFileSync(result.wellKnownDestination, 'utf8'));

    assert.deepEqual(wellKnownManifest, rootManifest);
    assert.equal(rootManifest.commitSha, '2222222222222222222222222222222222222222');
    assert.equal(rootManifest.branch, 'test-branch');
    assert.equal(rootManifest.environment, 'preview');
    assert.equal(rootManifest.deploymentProvider, 'local-or-ci-build');
    assert.equal(rootManifest.deploymentUrl, null);
    assert.equal(rootManifest.canonicalUrl, null);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
