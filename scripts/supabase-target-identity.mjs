import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.supabase.com/v1';
const REGISTRY_PATH = 'config/supabase-targets.json';
const DEFAULT_EVIDENCE_PATH = 'artifacts/supabase-target-identity.json';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalProjectUrl(projectRef) {
  return `https://${projectRef}.supabase.co`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function fingerprint(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

async function readRegistry(registryPath = REGISTRY_PATH) {
  const body = await fs.readFile(registryPath, 'utf8');
  const parsed = JSON.parse(body);
  if (!parsed || parsed.schemaVersion !== 1 || !parsed.targets || typeof parsed.targets !== 'object') {
    throw new Error('SUPABASE_TARGET_REGISTRY_INVALID');
  }
  return parsed;
}

function normalizeTarget(name, target) {
  const projectRef = clean(target?.projectRef);
  const projectUrl = clean(target?.projectUrl);
  const repository = clean(target?.repository);
  const environment = clean(target?.environment);
  if (!name || !projectRef || !projectUrl || !repository || !environment) {
    throw new Error(`SUPABASE_TARGET_INCOMPLETE ${name || 'unknown'}`);
  }
  if (projectUrl !== canonicalProjectUrl(projectRef)) {
    throw new Error(`SUPABASE_TARGET_URL_MISMATCH ${name}`);
  }
  return { name, projectRef, projectUrl, repository, environment };
}

export async function resolveSupabaseTarget(options = {}) {
  const env = options.env ?? process.env;
  const targetName = clean(options.targetName ?? env.SUPABASE_TARGET);
  if (!targetName) {
    throw new Error('SUPABASE_TARGET is required; refusing to guess which Supabase account/project to use.');
  }

  const registry = await readRegistry(options.registryPath);
  const rawTarget = registry.targets[targetName];
  if (!rawTarget) throw new Error(`SUPABASE_TARGET_UNKNOWN ${targetName}`);
  const target = normalizeTarget(targetName, rawTarget);

  const envProjectRef = clean(env.SUPABASE_PROJECT_REF);
  if (envProjectRef && envProjectRef !== target.projectRef) {
    throw new Error(`SUPABASE_TARGET_REF_MISMATCH target=${target.projectRef} env=${envProjectRef}`);
  }

  const envProjectUrl = clean(env.SUPABASE_URL);
  if (envProjectUrl && envProjectUrl.replace(/\/$/, '') !== target.projectUrl) {
    throw new Error(`SUPABASE_TARGET_URL_MISMATCH target=${target.projectUrl} env=${envProjectUrl.replace(/\/$/, '')}`);
  }

  const repository = clean(env.GITHUB_REPOSITORY);
  if (repository && repository !== target.repository) {
    throw new Error(`SUPABASE_TARGET_REPOSITORY_MISMATCH target=${target.repository} runtime=${repository}`);
  }

  const environment = clean(env.SUPABASE_ENVIRONMENT);
  if (environment && environment !== target.environment) {
    throw new Error(`SUPABASE_TARGET_ENVIRONMENT_MISMATCH target=${target.environment} runtime=${environment}`);
  }

  return target;
}

function observedProjectRef(payload) {
  return clean(payload?.ref) || clean(payload?.id);
}

function buildMarker(target, observed = {}, providerVerified = false) {
  const identity = {
    target: target.name,
    repository: target.repository,
    environment: target.environment,
    projectRef: target.projectRef,
    projectUrl: target.projectUrl,
    organizationId: clean(observed.organizationId) || null,
    projectName: clean(observed.projectName) || null,
  };
  const identityFingerprint = fingerprint(identity);
  return {
    schema: 'juss/supabase-proof-cookie@v1',
    kind: 'non-secret-continuity-marker',
    browserCookie: false,
    authority: false,
    providerVerified,
    identity,
    fingerprint: identityFingerprint,
    invalidatesOn: [
      'target',
      'repository',
      'environment',
      'projectRef',
      'projectUrl',
      'organizationId',
      'projectName',
    ],
  };
}

export function buildStaticSupabaseIdentityMarker(target) {
  return buildMarker(target, {}, false);
}

export async function verifySupabaseManagementIdentity(options = {}) {
  const env = options.env ?? process.env;
  const target = options.target ?? await resolveSupabaseTarget({ env, registryPath: options.registryPath });
  const accessToken = clean(options.accessToken ?? env.SUPABASE_ACCESS_TOKEN ?? env.SUPABASE_MANAGEMENT_API_TOKEN);
  if (!accessToken) throw new Error('SUPABASE_ACCESS_TOKEN is required for live Supabase target verification.');
  const fetchImpl = options.fetchImpl ?? fetch;

  let response;
  try {
    response = await fetchImpl(`${API_BASE}/projects/${encodeURIComponent(target.projectRef)}`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    });
  } catch (error) {
    throw new Error(`SUPABASE_TARGET_VERIFY_REQUEST_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    throw new Error(`SUPABASE_TARGET_VERIFY_HTTP_${response.status}`);
  }

  const payload = await response.json().catch(() => null);
  const ref = observedProjectRef(payload);
  if (!ref || ref !== target.projectRef) {
    throw new Error(`SUPABASE_TARGET_PROVIDER_REF_MISMATCH expected=${target.projectRef} observed=${ref || 'missing'}`);
  }

  const observed = {
    projectName: clean(payload?.name),
    organizationId: clean(payload?.organization_id) || clean(payload?.organization?.id),
  };
  return buildMarker(target, observed, true);
}

export async function writeSupabaseIdentityEvidence(marker, evidencePath = DEFAULT_EVIDENCE_PATH) {
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  const receipt = {
    ...marker,
    observedAt: new Date().toISOString(),
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return receipt;
}

async function main() {
  const target = await resolveSupabaseTarget();
  process.env.SUPABASE_PROJECT_REF = target.projectRef;
  if (!clean(process.env.SUPABASE_URL)) process.env.SUPABASE_URL = target.projectUrl;
  const marker = await verifySupabaseManagementIdentity({ target });
  const receipt = await writeSupabaseIdentityEvidence(marker);
  process.stdout.write(`SUPABASE_TARGET_VERIFIED ${receipt.identity.target} ${receipt.fingerprint}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
