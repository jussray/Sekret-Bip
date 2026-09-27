import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as core from './verify-supabase-production-schema-core.mjs';
import {
  PRODUCTION_HISTORY_RUNTIME_ALIASES,
  PRODUCTION_PGJWT_POLICY,
  evaluatePgjwtPolicy,
  excludeProductionReceiptMarkers,
} from './verify-supabase-production-schema.mjs';

const DEFAULT_DB_HOST = 'aws-1-us-east-1.pooler.supabase.com';
const DEFAULT_DB_PORT = '5432';
const DEFAULT_DB_NAME = 'postgres';
const DEFAULT_SSL_MODE = 'require';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function configFromEnv(env = process.env) {
  const projectRef = clean(env.SUPABASE_PROJECT_REF) || core.DEFAULT_PROJECT_REF;
  return {
    projectRef,
    password: clean(env.SUPABASE_DB_PASSWORD),
    host: clean(env.SUPABASE_DB_HOST) || DEFAULT_DB_HOST,
    port: clean(env.SUPABASE_DB_PORT) || DEFAULT_DB_PORT,
    database: clean(env.SUPABASE_DB_NAME) || DEFAULT_DB_NAME,
    user: clean(env.SUPABASE_DB_USER) || `postgres.${projectRef}`,
    sslMode: clean(env.SUPABASE_DB_SSLMODE) || DEFAULT_SSL_MODE,
    migrationsDir: clean(env.SUPABASE_MIGRATIONS_DIR) || core.DEFAULT_MIGRATIONS_DIR,
    evidencePath: clean(env.SUPABASE_SCHEMA_EVIDENCE_PATH) || core.DEFAULT_EVIDENCE_PATH,
  };
}

export function buildDatabaseWitnessQuery(projectRef) {
  const ref = clean(projectRef);
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error('SUPABASE_PROJECT_REF must be a 20-character lowercase project reference.');
  }

  return `select jsonb_build_object(
  'schema_version', 1,
  'project_ref', '${ref}',
  'query_mode', 'read-only-project-database-v1',
  'row', jsonb_build_object(
    'live_max_version', coalesce(max(version), ''),
    'migration_history', coalesce(
      jsonb_agg(
        jsonb_build_object('version', version, 'name', name)
        order by version
      ),
      '[]'::jsonb
    ),
    'pgjwt_installed', exists(
      select 1
      from pg_extension
      where extname = 'pgjwt'
    ),
    'pgjwt_version', (
      select extversion
      from pg_extension
      where extname = 'pgjwt'
      limit 1
    )
  )
)::text
from supabase_migrations.schema_migrations;`;
}

export function queryProductionDatabase(config, query) {
  const result = spawnSync(
    'psql',
    [
      '--no-psqlrc',
      '--no-align',
      '--tuples-only',
      '--quiet',
      '--set', 'ON_ERROR_STOP=1',
      '--command', query,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        PGHOST: config.host,
        PGPORT: config.port,
        PGDATABASE: config.database,
        PGUSER: config.user,
        PGPASSWORD: config.password,
        PGSSLMODE: config.sslMode,
      },
    },
  );

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      throw new Error('SUPABASE_DB_WITNESS_PSQL_UNAVAILABLE');
    }
    throw new Error(`SUPABASE_DB_WITNESS_PROCESS_FAILED: ${errorMessage(result.error)}`);
  }
  if (result.status !== 0) {
    const stderr = clean(result.stderr).replace(/password=[^\s]+/gi, 'password=[redacted]');
    throw new Error(`SUPABASE_DB_WITNESS_QUERY_FAILED: exit=${result.status}; ${stderr || 'psql returned no diagnostic'}`);
  }

  const stdout = clean(result.stdout);
  if (!stdout) throw new Error('SUPABASE_DB_WITNESS_EMPTY_RESPONSE');
  return stdout;
}

function initialEvidence(config) {
  return {
    schemaVersion: 4,
    verified: false,
    status: 'initializing',
    projectRef: config.projectRef || null,
    authority: {
      type: 'project-database',
      queryMode: 'read-only-project-database-v1',
      host: config.host || null,
      database: config.database || null,
      userBinding: config.user || null,
      sslMode: config.sslMode || null,
    },
    supabaseIdentity: null,
    authorityFloorVersion: core.PRODUCTION_HISTORY_AUTHORITY_FLOOR,
    expectedVersion: null,
    liveMaxVersion: null,
    providerHttpStatus: null,
    schemaComparisonPerformed: false,
    pgjwtObserved: null,
    pgjwtInstalled: null,
    pgjwtVersion: null,
    pgjwtPolicy: PRODUCTION_PGJWT_POLICY,
    requiredCanonicalVersions: [],
    representedCanonicalVersions: [],
    acceptedAliasVersions: [],
    missingCanonicalVersions: [],
    unexpectedRecentVersions: [],
    checkedAt: new Date().toISOString(),
  };
}

async function writeEvidence(evidencePath, evidence) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

async function failWithEvidence(config, evidence, status, errorCode, error) {
  evidence.status = status;
  evidence.error = errorCode;
  evidence.detail = errorMessage(error);
  evidence.checkedAt = new Date().toISOString();
  await writeEvidence(config.evidencePath, evidence);
  throw error;
}

export function validateDatabaseAuthority(config) {
  if (!config.password) throw new Error('SUPABASE_DB_PASSWORD is required for project database verification.');
  if (!/^[a-z0-9]{20}$/.test(config.projectRef)) {
    throw new Error('SUPABASE_PROJECT_REF must be a 20-character lowercase project reference.');
  }
  if (config.user !== `postgres.${config.projectRef}`) {
    throw new Error('SUPABASE_DB_USER must remain bound to postgres.<SUPABASE_PROJECT_REF>.');
  }
  if (config.database !== DEFAULT_DB_NAME) {
    throw new Error('SUPABASE_DB_NAME must remain postgres for production schema verification.');
  }
  if (config.port !== DEFAULT_DB_PORT) {
    throw new Error('SUPABASE_DB_PORT must remain 5432 for the production schema witness.');
  }
  if (config.sslMode !== DEFAULT_SSL_MODE) {
    throw new Error('SUPABASE_DB_SSLMODE must remain require for the production schema witness.');
  }
  if (!config.host.endsWith('.pooler.supabase.com')) {
    throw new Error('SUPABASE_DB_HOST must be a Supabase pooler host.');
  }
}

export async function verifySupabaseProductionDbWitness(options = {}) {
  const config = options.config ?? configFromEnv(options.env);
  const evidence = initialEvidence(config);

  let repositoryMigrations;
  try {
    const candidates = options.repositoryMigrations
      ?? await core.deriveRepositoryMigrationIdentities(config.migrationsDir);
    repositoryMigrations = excludeProductionReceiptMarkers(candidates);
    evidence.expectedVersion = core.normalizeSchemaVersion(repositoryMigrations.at(-1)?.version ?? null);
    if (!evidence.expectedVersion) {
      throw new Error('Expected Supabase schema version must be exactly 14 digits.');
    }
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'repository-schema-invalid',
      'repository_schema_version_unavailable',
      error,
    );
  }

  try {
    validateDatabaseAuthority(config);
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      'project_database_authority_invalid',
      error,
    );
  }

  const query = buildDatabaseWitnessQuery(config.projectRef);
  let rawReceipt;
  try {
    rawReceipt = options.queryRunner
      ? await options.queryRunner(config, query)
      : queryProductionDatabase(config, query);
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'project_database_query_failed',
      error,
    );
  }

  const receipt = typeof rawReceipt === 'string' ? parseJson(rawReceipt) : rawReceipt;
  if (!receipt || receipt.schema_version !== 1 || receipt.query_mode !== 'read-only-project-database-v1') {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'project_database_receipt_invalid',
      new Error('Supabase project database witness returned a malformed receipt.'),
    );
  }
  if (receipt.project_ref !== config.projectRef) {
    await failWithEvidence(
      config,
      evidence,
      'target-identity-failed',
      'supabase_project_database_ref_mismatch',
      new Error(`SUPABASE_PROJECT_DATABASE_REF_MISMATCH: expected=${config.projectRef}; observed=${receipt.project_ref ?? 'missing'}`),
    );
  }

  const row = receipt.row;
  const migrationHistory = row?.migration_history;
  if (!Array.isArray(migrationHistory)) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'production_migration_history_unavailable',
      new Error('Supabase production migration history is missing or malformed.'),
    );
  }

  evidence.schemaComparisonPerformed = true;
  const evaluated = core.evaluateMigrationHistory(
    row,
    repositoryMigrations,
    core.PRODUCTION_HISTORY_AUTHORITY_FLOOR,
    PRODUCTION_HISTORY_RUNTIME_ALIASES,
  );
  const policy = evaluatePgjwtPolicy(row, { requirePgjwtState: true });

  evidence.authorityFloorVersion = evaluated.authorityFloorVersion;
  evidence.expectedVersion = evaluated.expectedVersion;
  evidence.liveMaxVersion = evaluated.liveMaxVersion;
  evidence.pgjwtObserved = policy.observed;
  evidence.pgjwtInstalled = policy.installed;
  evidence.pgjwtVersion = policy.version;
  evidence.requiredCanonicalVersions = evaluated.requiredCanonicalVersions;
  evidence.representedCanonicalVersions = evaluated.representedCanonicalVersions;
  evidence.acceptedAliasVersions = evaluated.acceptedAliasVersions;
  evidence.missingCanonicalVersions = evaluated.missingCanonicalVersions;
  evidence.unexpectedRecentVersions = evaluated.unexpectedRecentVersions;
  evidence.verified = evaluated.verified && policy.verified;
  evidence.status = !evaluated.verified
    ? 'schema-drift'
    : (policy.verified ? 'verified' : 'extension-policy-drift');
  evidence.checkedAt = new Date().toISOString();
  await writeEvidence(config.evidencePath, evidence);

  if (!evaluated.verified) {
    const missing = evaluated.missingCanonicalVersions.join(',') || 'none';
    const unexpected = evaluated.unexpectedRecentVersions.map((item) => item.liveVersion).join(',') || 'none';
    throw new Error(
      `SUPABASE_PRODUCTION_SCHEMA_DRIFT: repo_head=${evaluated.expectedVersion}, `
      + `live_head=${evaluated.liveMaxVersion ?? 'missing'}, missing=${missing}, unexpected=${unexpected}.`,
    );
  }
  if (!policy.verified) {
    throw new Error(
      'SUPABASE_EXTENSION_POLICY_DRIFT: '
      + `pgjwt expected installed=${policy.expectedInstalled} version=${policy.expectedVersion ?? 'none'}, `
      + `live installed=${policy.installed} version=${policy.version ?? 'none'}, observed=${policy.observed}.`,
    );
  }

  return evidence;
}

async function main() {
  const evidence = await verifySupabaseProductionDbWitness();
  console.log(JSON.stringify(evidence, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
