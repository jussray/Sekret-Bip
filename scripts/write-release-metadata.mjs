import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyPublicWebConfig} from './verify-public-web-config.mjs';

function gitValue(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveReleaseMetadata(env = process.env, cwd = process.cwd(), now = new Date()) {
  const checkedOutCommit = gitValue(['rev-parse', 'HEAD'], cwd);
  const checkedOutBranch = gitValue(['symbolic-ref', '--short', '-q', 'HEAD'], cwd);

  const commitSha = (
    clean(env.CF_PAGES_COMMIT_SHA)
    || checkedOutCommit
    || clean(env.GITHUB_SHA)
    || 'unknown'
  ).toLowerCase();

  const branch = (
    clean(env.CF_PAGES_BRANCH)
    || clean(env.GITHUB_HEAD_REF)
    || checkedOutBranch
    || clean(env.GITHUB_REF_NAME)
    || 'unknown'
  );

  const deploymentProvider = env.CF_PAGES === '1'
    ? 'cloudflare-pages'
    : 'local-or-ci-build';
  const environment = clean(env.SEKRET_RELEASE_ENVIRONMENT)
    || (deploymentProvider === 'cloudflare-pages' && branch === 'main' ? 'production' : 'preview');
  const canonicalUrl = clean(env.SEKRET_CANONICAL_URL)
    || (environment === 'production' ? 'https://sekretbip.net' : null);

  return {
    schemaVersion: 2,
    app: 'sekret-bip',
    surface: 'web-front-door',
    environment,
    commitSha,
    branch,
    deploymentProvider,
    deploymentId: clean(env.CF_PAGES_DEPLOYMENT_ID) || clean(env.GITHUB_RUN_ID) || null,
    deploymentUrl: clean(env.CF_PAGES_URL) || null,
    canonicalUrl,
    builtAt: now.toISOString(),
  };
}

export function writeReleaseMetadata(outputDirectory = 'dist', options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const metadata = resolveReleaseMetadata(options.env ?? process.env, cwd, options.now ?? new Date());
  const absoluteOutput = path.resolve(cwd, outputDirectory);
  const wellKnownDirectory = path.join(absoluteOutput, '.well-known');
  fs.mkdirSync(wellKnownDirectory, {recursive: true});

  const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
  const destination = path.join(absoluteOutput, 'release.json');
  const wellKnownDestination = path.join(wellKnownDirectory, 'sekret-release.json');
  fs.writeFileSync(destination, serialized, 'utf8');
  fs.writeFileSync(wellKnownDestination, serialized, 'utf8');

  return {destination, wellKnownDestination, metadata};
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  const outputDirectory = process.argv[2] || 'dist';
  const verification = verifyPublicWebConfig(outputDirectory);
  console.log(
    `Verified ${verification.verifiedNames.length} required public configuration values in ${verification.distPath}.`,
  );
  const result = writeReleaseMetadata(outputDirectory);
  console.log(`Wrote release metadata to ${result.destination}`);
  console.log(`Wrote well-known release metadata to ${result.wellKnownDestination}`);
  console.log(JSON.stringify(result.metadata));
}
