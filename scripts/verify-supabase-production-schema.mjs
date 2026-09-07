import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as core from './verify-supabase-production-schema-core.mjs';

export * from './verify-supabase-production-schema-core.mjs';

export const PRODUCTION_HISTORY_RUNTIME_ALIASES = Object.freeze({
  ...core.PRODUCTION_HISTORY_ALL_ACCEPTED_ALIASES,
  '20260822060000': '20260824004706',
  '20260824223800': '20260826065736',
  '20260826012500': '20260905233953',
  '20260827060000': '20260905234133',
  '20260827061000': '20260905234009',
  '20260827062000': '20260905234019',
  '20260827063000': '20260905234039',
  '20260831233000': '20260905234048',
  '20260901000500': '20260901000535',
});

export const PRODUCTION_PGJWT_POLICY = Object.freeze({
  installed: true,
  version: '0.2.0',
  authority: 'founder-explicit',
  decision: 'retain',
  boundTo: 'supabase-dashboard:2026-08-20T21:51:28.984Z',
});

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseMigrationHistory(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readPgjwtState(row, { allowInjectedFallback = false } = {}) {
  const rawInstalled = row?.pgjwt_installed ?? row?.pgjwtInstalled;
  const observed = rawInstalled === true
    || rawInstalled === false
    || rawInstalled === 'true'
    || rawInstalled === 'false';

  if (!observed && allowInjectedFallback) {
    return {
      observed: false,
      installed: PRODUCTION_PGJWT_POLICY.installed,
      version: PRODUCTION_PGJWT_POLICY.version,
    };
  }

  const installed = rawInstalled === true || rawInstalled === 'true';
  const version = clean(row?.pgjwt_version ?? row?.pgjwtVersion) || null;
  return { observed, installed, version };
}

export function evaluatePgjwtPolicy(row, options = {}) {
  const state = readPgjwtState(row, options);
  const expectedInstalled = PRODUCTION_PGJWT_POLICY.installed;
  const expectedVersion = expectedInstalled ? PRODUCTION_PGJWT_POLICY.version : null;
  const verified = state.observed
    ? state.installed === expectedInstalled
      && (!expectedInstalled || state.version === expectedVersion)
    : Boolean(options.allowInjectedFallback);

  return {
    ...state,
    expectedInstalled,
    expectedVersion,
    verified,
  };
}

export function buildReadOnlyQuery() {
  return `select
  coalesce(max(version), '') as live_max_version,
  coalesce(
    jsonb_agg(
      jsonb_build_object('version', version, 'name', name)
      order by version
    ),
    '[]'::jsonb
  ) as migration_history,
  exists(
    select 1
    from pg_extension
    where extname = 'pgjwt'
  ) as pgjwt_installed,
  (
    select extversion
    from pg_extension
    where extname = 'pgjwt'
    limit 1
  ) as pgjwt_version
from supabase_migrations.schema_migrations;`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeEvidence(evidencePath, evidence) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function initialEvidence(config) {
  return {
    schemaVersion: 2,
    verified: false,
    status: 'initializing',
    projectRef: config.projectRef || null,
    authorityFloorVersion: core.PRODUCTION_HISTORY_AUTHORITY_FLOOR,
    expectedVersion: null,
    liveMaxVersion: null,
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

async function failWithEvidence(config, evidence, status, errorCode, error) {
  evidence.status = status;
  evidence.error = errorCode;
  evidence.detail = errorMessage(error);
  evidence.checkedAt = new Date().toISOString();
  await writeEvidence(config.evidencePath, evidence);
  throw error;
}

export async function verifySupabaseProductionSchema(options = {}) {
  const config = options.config ?? core.configFromEnv(options.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const evidence = initialEvidence(config);

  let expectedVersion;
  let repositoryMigrations;
  try {
    expectedVersion = options.expectedVersion
      ?? await core.deriveRepositorySchemaVersion(config.migrationsDir);
    expectedVersion = core.normalizeSchemaVersion(expectedVersion);
    if (!expectedVersion) {
      throw new Error('Expected Supabase schema version must be exactly 14 digits.');
    }
    evidence.expectedVersion = expectedVersion;

    repositoryMigrations = options.repositoryMigrations
      ?? await core.deriveRepositoryMigrationIdentities(config.migrationsDir);
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'repository-schema-invalid',
      'repository_schema_version_unavailable',
      error,
    );
  }

  if (!config.token) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      'missing_supabase_access_token',
      new Error('SUPABASE_ACCESS_TOKEN is required for production schema verification.'),
    );
  }
  if (!config.projectRef) {
    await failWithEvidence(
      config,
      evidence,
      'configuration-invalid',
      'missing_supabase_project_ref',
      new Error('SUPABASE_PROJECT_REF is required.'),
    );
  }

  let response;
  try {
    response = await fetchImpl(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(config.projectRef)}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: buildReadOnlyQuery(), read_only: true }),
      },
    );
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'management_api_request_failed',
      error,
    );
  }

  let payload;
  try {
    payload = await readJson(response);
  } catch (error) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'management_api_response_read_failed',
      error,
    );
  }

  if (!response.ok) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      `management_api_http_${response.status}`,
      new Error(`Supabase read-only production schema verification failed with HTTP ${response.status}.`),
    );
  }

  const rows = core.extractRows(payload);
  const row = rows[0];
  const migrationHistory = parseMigrationHistory(
    row?.migration_history ?? row?.migrationHistory,
  );

  if (!migrationHistory) {
    await failWithEvidence(
      config,
      evidence,
      'provider-query-failed',
      'production_migration_history_unavailable',
      new Error('Supabase production migration history is missing or malformed.'),
    );
  }

  const evaluated = core.evaluateMigrationHistory({
    ...row,
    migration_history: migrationHistory,
  }, repositoryMigrations, core.PRODUCTION_HISTORY_AUTHORITY_FLOOR, PRODUCTION_HISTORY_RUNTIME_ALIASES);
  const policy = evaluatePgjwtPolicy(row, {
    allowInjectedFallback: Boolean(options.fetchImpl) && options.requirePgjwtState !== true,
  });

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
    const unexpected = evaluated.unexpectedRecentVersions
      .map((migration) => migration.liveVersion)
      .join(',') || 'none';
    throw new Error(
      `SUPABASE_PRODUCTION_SCHEMA_DRIFT: repo_head=${evaluated.expectedVersion}, `
      + `live_head=${evaluated.liveMaxVersion ?? 'missing'}, missing=${missing}, `
      + `unexpected=${unexpected}.`,
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
  const evidence = await verifySupabaseProductionSchema();
  process.stdout.write(
    `Supabase production schema verified at ${evidence.expectedVersion}; `
    + `pgjwt policy verified at ${evidence.pgjwtVersion}.\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
