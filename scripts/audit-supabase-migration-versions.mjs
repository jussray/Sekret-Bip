/**
 * Read-only Supabase migration version comparator.
 * Legacy short migration versions are immutable. Sort extracted versions,
 * never entire filenames (Supabase CLI #6036), and never repair history.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MIGRATION_FILE = /^(\d{4}|\d{8}|\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;
const VERSION = /^(?:\d{4}|\d{8}|\d{14})$/;
const byVersion = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function indexLocalMigrations(filenames) {
  if (!Array.isArray(filenames)) throw new Error('Migration filenames must be an array.');
  const migrations = [];
  const seen = new Map();
  for (const filename of filenames) {
    if (typeof filename !== 'string' || !filename.endsWith('.sql')) continue;
    const match = filename.match(MIGRATION_FILE);
    if (!match) throw new Error('Invalid migration filename: ' + filename);
    const version = match[1];
    if (seen.has(version)) {
      throw new Error('Duplicate migration version ' + version + ': ' + seen.get(version) + ' and ' + filename);
    }
    seen.set(version, filename);
    migrations.push({ version, filename });
  }
  if (!migrations.length) throw new Error('No migration SQL files found.');
  return migrations.sort((a, b) => byVersion(a.version, b.version));
}

export function analyzeMigrationVersions(localMigrations, remoteVersions = null) {
  if (!Array.isArray(localMigrations) || !localMigrations.length) {
    throw new Error('A nonempty local migration catalog is required.');
  }
  const versions = localMigrations.map(item => item.version);
  const localSet = new Set(versions);
  if (localSet.size !== versions.length) throw new Error('Duplicate local migration versions.');
  const prefixCollisions = localMigrations.filter(item =>
    item.version.length < 14 && versions.some(version =>
      version.length === 14 && version.startsWith(item.version),
    ),
  ).map(item => item.version);

  const report = {
    schema: 'juss/supabase-migration-version-audit@v1',
    comparison: 'extracted-version-lexical',
    localCount: versions.length,
    remoteObserved: remoteVersions !== null,
    remoteCount: null,
    missingLocal: [],
    pendingRemote: [],
    prefixCollisions,
    outcome: 'LOCAL_ONLY_REMOTE_UNVERIFIED',
    authorizesMigrationMutation: false,
    authorizesHistoryRepair: false,
    providerPreviewCheckReplaced: false,
  };
  if (remoteVersions === null) return report;
  if (!Array.isArray(remoteVersions) || !remoteVersions.length) {
    throw new Error('Remote migration history must be a nonempty array.');
  }
  const raw = remoteVersions.map(value => typeof value === 'string' ? value : value?.version);
  if (raw.some(value => typeof value !== 'string' || !VERSION.test(value))) {
    throw new Error('Remote migration history has an invalid or missing version.');
  }
  if (new Set(raw).size !== raw.length) throw new Error('Duplicate remote migration versions.');
  const remoteSet = new Set(raw);
  report.remoteCount = raw.length;
  report.missingLocal = raw.filter(version => !localSet.has(version)).sort(byVersion);
  report.pendingRemote = versions.filter(version => !remoteSet.has(version)).sort(byVersion);
  report.outcome = report.missingLocal.length ? 'REMOTE_VERSION_MISSING_LOCALLY'
    : report.pendingRemote.length ? 'HISTORY_MATCH_PENDING_MIGRATIONS'
      : 'VERSIONS_MATCH';
  return report;
}

function parseArgs(args) {
  const options = { migrationsDir: 'supabase/migrations', remoteFile: null, output: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--migrations-dir') options.migrationsDir = args[++i];
    else if (arg === '--remote-file') options.remoteFile = args[++i];
    else if (arg === '--output') options.output = args[++i];
    else if (arg !== '--local-only') throw new Error('Unrecognized argument: ' + arg);
  }
  if (!options.migrationsDir || (args.includes('--remote-file') && !options.remoteFile) ||
      (args.includes('--output') && !options.output)) throw new Error('Missing command argument value.');
  return options;
}

export async function auditFromFiles({ migrationsDir, remoteFile = null }) {
  const local = indexLocalMigrations(await fs.readdir(migrationsDir));
  let remote = null;
  if (remoteFile) {
    const parsed = JSON.parse(await fs.readFile(remoteFile, 'utf8'));
    remote = Array.isArray(parsed) ? parsed : parsed?.migrations;
    if (!Array.isArray(remote)) throw new Error('Remote history must be a JSON array or an object containing migrations.');
  }
  return analyzeMigrationVersions(local, remote);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await auditFromFiles(options);
  const serialized = JSON.stringify(report, null, 2) + '\n';
  if (options.output) {
    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, serialized, 'utf8');
  }
  if (report.outcome === 'REMOTE_VERSION_MISSING_LOCALLY') {
    console.error('SUPABASE_REMOTE_MIGRATION_NOT_IN_REPO');
    process.exitCode = 2;
  } else {
    console.log('SUPABASE_MIGRATION_VERSION_AUDIT_RECORDED');
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    // Preserve a fixed failure code without printing provider or account details.
    console.error('SUPABASE_MIGRATION_VERSION_AUDIT_FAILED');
    process.exitCode = 1;
  });
}
