import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const nodeVersion = fs.readFileSync('.node-version', 'utf8').trim();
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deployment = fs.readFileSync('DEPLOYMENT.md', 'utf8');
const appConfig = fs.readFileSync('app.config.ts', 'utf8');
const releaseBootstrap = fs.readFileSync('scripts/bootstrap-release-metadata-source.mjs', 'utf8');
const releaseWriter = fs.readFileSync('scripts/write-release-metadata.mjs', 'utf8');

test('Cloudflare Pages uses the repository-supported Node runtime', () => {
  assert.equal(nodeVersion, '22.16.0');
  assert.match(packageJson.dependencies.expo, /56/);
});

test('frontend build exports Expo and writes the release marker', () => {
  assert.equal(
    packageJson.scripts['build:web'],
    'expo export -p web && node scripts/write-release-metadata.mjs dist',
  );
  assert.match(releaseWriter, /path\.join\(absoluteOutput, 'release\.json'\)/);
  assert.match(releaseWriter, /CF_PAGES_COMMIT_SHA/);
  assert.match(releaseWriter, /CF_PAGES_BRANCH/);
});

test('direct Expo exports bootstrap marker sources before public files are copied', () => {
  assert.match(appConfig, /process\.env\.CF_PAGES !== '1'/);
  assert.match(appConfig, /bootstrap-release-metadata-source\.mjs/);
  assert.match(appConfig, /execFileSync\(process\.execPath, \[scriptPath\]/);
  assert.match(appConfig, /prepareCloudflareReleaseSource\(\);/);
  assert.match(releaseBootstrap, /writeReleaseMetadata\('public'/);
  assert.match(releaseBootstrap, /requires CF_PAGES=1/);
});

test('deployment contract pins the Pages command and output directory', () => {
  assert.match(deployment, /Node runtime: `\.node-version` must resolve to `22\.16\.0`/);
  assert.match(deployment, /build command: `npm run build:web`/);
  assert.match(deployment, /output directory: `dist`/);
  assert.match(deployment, /Expo SDK 56 requires Node 22\.13 or newer/);
});
