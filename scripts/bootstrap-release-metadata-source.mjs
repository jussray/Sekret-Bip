import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveReleaseMetadata,
  writeReleaseMetadata,
} from './write-release-metadata.mjs';

const STABLE_RELEASE_FIELDS = [
  'schemaVersion',
  'app',
  'surface',
  'environment',
  'commitSha',
  'branch',
  'deploymentProvider',
  'deploymentId',
  'deploymentUrl',
  'canonicalUrl',
];

function stableReleaseIdentity(metadata) {
  return Object.fromEntries(
    STABLE_RELEASE_FIELDS.map((field) => [field, metadata?.[field] ?? null]),
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sameStableRelease(left, right) {
  return JSON.stringify(stableReleaseIdentity(left))
    === JSON.stringify(stableReleaseIdentity(right));
}

export function bootstrapReleaseMetadataSource(options = {}) {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();

  if (env.CF_PAGES !== '1') {
    throw new Error('Cloudflare Pages release-source bootstrap requires CF_PAGES=1.');
  }

  const outputDirectory = path.resolve(cwd, 'public');
  const destination = path.join(outputDirectory, 'release.json');
  const wellKnownDestination = path.join(
    outputDirectory,
    '.well-known',
    'sekret-release.json',
  );
  const expected = resolveReleaseMetadata(env, cwd, now);

  if (fs.existsSync(destination) && fs.existsSync(wellKnownDestination)) {
    try {
      const existing = readJson(destination);
      const existingWellKnown = readJson(wellKnownDestination);

      if (
        sameStableRelease(existing, expected)
        && JSON.stringify(existing) === JSON.stringify(existingWellKnown)
        && Number.isFinite(Date.parse(existing.builtAt))
      ) {
        return {
          destination,
          wellKnownDestination,
          metadata: existing,
          reused: true,
        };
      }
    } catch {
      // Malformed or partial marker source is replaced below.
    }
  }

  return {
    ...writeReleaseMetadata('public', { cwd, env, now }),
    reused: false,
  };
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const result = bootstrapReleaseMetadataSource();
  console.log(`${result.reused ? 'Reused' : 'Prepared'} release metadata source at ${result.destination}`);
  console.log(`${result.reused ? 'Reused' : 'Prepared'} well-known release metadata source at ${result.wellKnownDestination}`);
  console.log(JSON.stringify(result.metadata));
}
