import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRODUCTION_HISTORY_RUNTIME_ALIASES } from './verify-supabase-production-schema.mjs';

const MIGRATION_ROOT = 'supabase/migrations';
const TIMESTAMPED_MIGRATION = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;
const PRODUCTION_RECEIPT_MARKER = /^-- Production receipt marker for canonical migration (\d{14})\.\n-- Already applied to the linked Supabase project; no schema changes\.$/;

function git(rootDir, ...args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function listMigrationPaths(rootDir, ref) {
  const output = git(rootDir, 'ls-tree', '-r', '--name-only', ref, '--', MIGRATION_ROOT);
  return output ? output.split('\n').filter(Boolean) : [];
}

function migrationVersion(relativePath) {
  const match = path.posix.basename(relativePath).match(TIMESTAMPED_MIGRATION);
  return match?.[1] ?? null;
}

function blobSha(rootDir, ref, relativePath) {
  return git(rootDir, 'rev-parse', `${ref}:${relativePath}`);
}

function parseDiff(rootDir, baseRef, headRef) {
  const output = git(
    rootDir,
    'diff',
    '--name-status',
    '--find-renames',
    baseRef,
    headRef,
    '--',
    MIGRATION_ROOT,
  );
  if (!output) return [];

  return output.split('\n').filter(Boolean).map((line) => {
    const columns = line.split('\t');
    const status = columns[0];
    if (status.startsWith('R') || status.startsWith('C')) {
      return { status, oldPath: columns[1], path: columns[2] };
    }
    return { status, path: columns[1] };
  });
}

function classifyProductionReceiptMarker({
  rootDir,
  headRef,
  relativePath,
  version,
  name,
  receiptAliases,
  headPathSet,
}) {
  const contents = git(rootDir, 'show', `${headRef}:${relativePath}`);
  const marker = contents.match(PRODUCTION_RECEIPT_MARKER);
  if (!marker) return null;

  const canonicalVersion = marker[1];
  if (receiptAliases?.[canonicalVersion] !== version) return null;

  const canonicalPath = `${MIGRATION_ROOT}/${canonicalVersion}_${name}.sql`;
  if (!headPathSet.has(canonicalPath)) return null;

  return {
    path: relativePath,
    liveVersion: version,
    canonicalVersion,
    canonicalPath,
  };
}

export function verifyMigrationLineage({
  rootDir = process.cwd(),
  baseRef,
  headRef = 'HEAD',
  productionReceiptAliases = PRODUCTION_HISTORY_RUNTIME_ALIASES,
}) {
  if (!baseRef) throw new Error('baseRef is required');

  git(rootDir, 'cat-file', '-e', `${baseRef}^{commit}`);
  git(rootDir, 'cat-file', '-e', `${headRef}^{commit}`);

  const basePaths = listMigrationPaths(rootDir, baseRef);
  const headPaths = listMigrationPaths(rootDir, headRef);
  const headPathSet = new Set(headPaths);
  const baseTimestamped = basePaths
    .map((migrationPath) => ({ path: migrationPath, version: migrationVersion(migrationPath) }))
    .filter((entry) => entry.version);
  const headTimestamped = headPaths
    .map((migrationPath) => ({ path: migrationPath, version: migrationVersion(migrationPath) }))
    .filter((entry) => entry.version);

  const baseMaxVersion = baseTimestamped
    .map((entry) => entry.version)
    .sort()
    .at(-1) ?? null;

  const baseBlobOwners = new Map();
  for (const entry of baseTimestamped) {
    const sha = blobSha(rootDir, baseRef, entry.path);
    const owners = baseBlobOwners.get(sha) ?? [];
    owners.push(entry.path);
    baseBlobOwners.set(sha, owners);
  }

  const violations = [];
  const additions = [];
  const productionReceiptMarkers = [];
  const diff = parseDiff(rootDir, baseRef, headRef);

  for (const change of diff) {
    const code = change.status[0];

    if (code === 'M' || code === 'T') {
      violations.push({
        code: 'immutable-migration-modified',
        path: change.path,
        detail: 'An existing migration changed after entering repository history.',
      });
      continue;
    }

    if (code === 'D') {
      violations.push({
        code: 'immutable-migration-deleted',
        path: change.path,
        detail: 'An existing migration was deleted after entering repository history.',
      });
      continue;
    }

    if (code === 'R') {
      violations.push({
        code: 'immutable-migration-renamed',
        path: change.path,
        previousPath: change.oldPath,
        detail: 'An existing migration was renamed or retimestamped.',
      });
      continue;
    }

    if (code === 'C') {
      violations.push({
        code: 'immutable-migration-copied',
        path: change.path,
        previousPath: change.oldPath,
        detail: 'An existing migration was copied into a second migration identity.',
      });
      continue;
    }

    if (code !== 'A') {
      violations.push({
        code: 'unsupported-migration-change',
        path: change.path,
        detail: `Unsupported git migration status: ${change.status}`,
      });
      continue;
    }

    const basename = path.posix.basename(change.path);
    const match = basename.match(TIMESTAMPED_MIGRATION);
    if (!match) {
      violations.push({
        code: 'invalid-new-migration-name',
        path: change.path,
        detail: 'New migrations must use <14-digit timestamp>_<snake_case_name>.sql.',
      });
      continue;
    }

    const [, version, name] = match;
    const receiptMarker = classifyProductionReceiptMarker({
      rootDir,
      headRef,
      relativePath: change.path,
      version,
      name,
      receiptAliases: productionReceiptAliases,
      headPathSet,
    });
    if (receiptMarker) {
      productionReceiptMarkers.push(receiptMarker);
      continue;
    }

    additions.push({ path: change.path, version, name });

    if (/^\d{14}_/.test(name)) {
      violations.push({
        code: 'embedded-migration-timestamp',
        path: change.path,
        detail: 'New migration names cannot embed a second migration timestamp.',
      });
    }

    if (baseMaxVersion && version <= baseMaxVersion) {
      violations.push({
        code: 'non-monotonic-migration-version',
        path: change.path,
        version,
        baseMaxVersion,
        detail: 'New migration versions must be newer than every timestamped migration already on the base ref.',
      });
    }

    const contents = git(rootDir, 'show', `${headRef}:${change.path}`);
    if (!contents.trim()) {
      violations.push({
        code: 'empty-migration',
        path: change.path,
        detail: 'New migration SQL cannot be empty.',
      });
    }

    const sha = blobSha(rootDir, headRef, change.path);
    const duplicateOwners = baseBlobOwners.get(sha) ?? [];
    if (duplicateOwners.length > 0) {
      violations.push({
        code: 'duplicate-existing-migration-sql',
        path: change.path,
        matches: duplicateOwners,
        detail: 'New migration SQL exactly duplicates an existing timestamped migration, which commonly indicates retimestamping.',
      });
    }
  }

  const versions = new Map();
  for (const entry of headTimestamped) {
    const owners = versions.get(entry.version) ?? [];
    owners.push(entry.path);
    versions.set(entry.version, owners);
  }
  for (const [version, owners] of versions) {
    if (owners.length > 1) {
      violations.push({
        code: 'duplicate-migration-version',
        version,
        paths: owners,
        detail: 'A migration timestamp must identify exactly one local migration file.',
      });
    }
  }

  additions.sort((a, b) => a.version.localeCompare(b.version));
  productionReceiptMarkers.sort((a, b) => a.liveVersion.localeCompare(b.liveVersion));
  violations.sort((a, b) => `${a.path ?? ''}:${a.code}`.localeCompare(`${b.path ?? ''}:${b.code}`));

  return {
    schemaVersion: 2,
    baseRef,
    headRef,
    baseMigrationCount: basePaths.length,
    headMigrationCount: headPaths.length,
    baseTimestampedMigrationCount: baseTimestamped.length,
    headTimestampedMigrationCount: headTimestamped.length,
    baseMaxVersion,
    addedMigrationCount: additions.length,
    addedMigrations: additions,
    productionReceiptMarkerCount: productionReceiptMarkers.length,
    productionReceiptMarkers,
    violationCount: violations.length,
    violations,
    verified: violations.length === 0,
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith('--base=')) options.baseRef = argument.slice('--base='.length);
    else if (argument === '--base') options.baseRef = argv[++index];
    else if (argument.startsWith('--head=')) options.headRef = argument.slice('--head='.length);
    else if (argument === '--head') options.headRef = argv[++index];
    else if (argument.startsWith('--report=')) options.report = argument.slice('--report='.length);
    else if (argument === '--report') options.report = argv[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliInvocation()) {
  try {
    const { baseRef, headRef = 'HEAD', report } = parseArguments(process.argv.slice(2));
    const result = verifyMigrationLineage({ baseRef, headRef });
    const payload = `${JSON.stringify(result, null, 2)}\n`;

    if (report) {
      fs.mkdirSync(path.dirname(path.resolve(report)), { recursive: true });
      fs.writeFileSync(report, payload);
    }
    process.stdout.write(payload);

    if (!result.verified) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
