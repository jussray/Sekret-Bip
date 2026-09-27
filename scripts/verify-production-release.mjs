#!/usr/bin/env node

const expectedSha = (process.argv[2] || process.env.EXPECTED_RELEASE_SHA || '').trim().toLowerCase();
const canonicalUrl = (process.env.SEKRET_CANONICAL_URL || 'https://sekretbip.net').replace(/\/$/, '');
const manifestUrl = `${canonicalUrl}/.well-known/sekret-release.json`;

if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
  console.error('Usage: node scripts/verify-production-release.mjs <40-character-commit-sha>');
  process.exit(2);
}

let response;
try {
  response = await fetch(manifestUrl, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
  });
} catch (error) {
  console.error(`Could not reach ${manifestUrl}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (!response.ok) {
  console.error(`Release manifest request failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

let manifest;
try {
  manifest = await response.json();
} catch {
  console.error(`Release manifest at ${manifestUrl} was not valid JSON.`);
  process.exit(1);
}

const failures = [];
if (manifest.schemaVersion !== 2) failures.push(`schemaVersion=${String(manifest.schemaVersion)}`);
if (manifest.app !== 'sekret-bip') failures.push(`app=${String(manifest.app)}`);
if (manifest.surface !== 'web-front-door') failures.push(`surface=${String(manifest.surface)}`);
if (manifest.environment !== 'production') failures.push(`environment=${String(manifest.environment)}`);
if (manifest.canonicalUrl !== canonicalUrl) failures.push(`canonicalUrl=${String(manifest.canonicalUrl)}`);
if (String(manifest.commitSha || '').toLowerCase() !== expectedSha) {
  failures.push(`commitSha=${String(manifest.commitSha)} expected=${expectedSha}`);
}

if (failures.length > 0) {
  console.error('Live-domain release verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(JSON.stringify(manifest, null, 2));
  process.exit(1);
}

console.log(`Verified ${canonicalUrl} is serving ${expectedSha}.`);
console.log(JSON.stringify(manifest, null, 2));
