import crypto from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const DEFAULT_OUTPUT = 'artifacts/cloudflare-pages-branch-authority.json';
const DEFAULT_PROJECT = 'sekret-bip';
const DEFAULT_BRANCH = 'main';
const DEFAULT_REPO_OWNER = 'jussray';
const DEFAULT_REPO_NAME = 'Sekret-Bip';
const DEFAULT_CANONICAL_DOMAIN = 'app.sekretbip.net';
const VALID_PREVIEW_SETTINGS = new Set(['all', 'none', 'custom']);

function clean(value) {
  return String(value ?? '').trim();
}

function cleanArray(value) {
  return Array.isArray(value) ? value.map(clean) : [];
}

export function normalizePagesProject(project = {}) {
  const source = project?.source && typeof project.source === 'object' ? project.source : {};
  const sourceConfig = source?.config && typeof source.config === 'object' ? source.config : {};

  return {
    name: clean(project?.name),
    productionBranch: clean(project?.production_branch || sourceConfig?.production_branch),
    productionDeploymentsEnabled:
      typeof sourceConfig?.production_deployments_enabled === 'boolean'
        ? sourceConfig.production_deployments_enabled
        : null,
    previewDeploymentSetting: clean(sourceConfig?.preview_deployment_setting) || null,
    previewBranchIncludes: cleanArray(sourceConfig?.preview_branch_includes),
    previewBranchExcludes: cleanArray(sourceConfig?.preview_branch_excludes),
    sourceType: clean(source?.type) || null,
    repoOwner: clean(sourceConfig?.owner) || null,
    repoName: clean(sourceConfig?.repo_name) || null,
    domains: cleanArray(project?.domains).filter(Boolean),
  };
}

export function fingerprintPagesAuthority(observed) {
  return crypto.createHash('sha256').update(JSON.stringify(observed)).digest('hex');
}

export function evaluatePagesBranchAuthority(
  project,
  {
    expectedProject = DEFAULT_PROJECT,
    expectedBranch = DEFAULT_BRANCH,
    expectedRepoOwner = DEFAULT_REPO_OWNER,
    expectedRepoName = DEFAULT_REPO_NAME,
    expectedCanonicalDomain = DEFAULT_CANONICAL_DOMAIN,
  } = {},
) {
  const observed = normalizePagesProject(project);
  const failures = [];

  if (observed.name !== expectedProject) failures.push(`project-name:${observed.name || 'missing'}`);
  if (observed.sourceType !== 'github') failures.push(`source-type:${observed.sourceType || 'missing'}`);
  if (observed.repoOwner !== expectedRepoOwner) failures.push(`repo-owner:${observed.repoOwner || 'missing'}`);
  if (observed.repoName !== expectedRepoName) failures.push(`repo-name:${observed.repoName || 'missing'}`);
  if (!observed.domains.includes(expectedCanonicalDomain)) failures.push(`canonical-domain:${expectedCanonicalDomain}:missing`);
  if (observed.productionBranch !== expectedBranch) failures.push(`production-branch:${observed.productionBranch || 'missing'}`);
  if (observed.productionDeploymentsEnabled !== true) failures.push(`production-deployments-enabled:${String(observed.productionDeploymentsEnabled)}`);
  if (!VALID_PREVIEW_SETTINGS.has(observed.previewDeploymentSetting)) failures.push(`preview-deployment-setting:${observed.previewDeploymentSetting || 'missing'}`);

  return {
    observed,
    fingerprint: fingerprintPagesAuthority(observed),
    verified: failures.length === 0,
    failures,
  };
}

async function cloudflareGet(token, pathName) {
  const response = await fetch(`${API_BASE}${pathName}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const codes = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => error?.code).filter((code) => Number.isInteger(code))
      : [];
    const error = new Error(`Cloudflare GET ${pathName} failed with provider status ${response.status}`);
    error.providerStatus = response.status;
    error.providerCodes = codes;
    throw error;
  }
  return payload?.result;
}

async function selectPagesCredential(env, accountId, projectName) {
  const candidates = [
    { source: 'CLOUDFLARE_PAGES_READ_API_TOKEN', token: clean(env.CLOUDFLARE_PAGES_READ_API_TOKEN) },
    { source: 'CLOUDFLARE_API_TOKEN', token: clean(env.CLOUDFLARE_API_TOKEN) },
    { source: 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN', token: clean(env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN) },
  ].filter((candidate) => candidate.token);

  if (candidates.length === 0) {
    throw new Error('A Cloudflare token with read access to the Pages project is required.');
  }

  const projectPath = `/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`;
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const project = await cloudflareGet(candidate.token, projectPath);
      return { ...candidate, project };
    } catch (error) {
      lastError = error;
    }
  }

  const providerStatus = Number(lastError?.providerStatus);
  const providerCodes = Array.isArray(lastError?.providerCodes)
    ? lastError.providerCodes.filter((code) => Number.isInteger(code))
    : [];
  const suffix = Number.isInteger(providerStatus) ? ` Last provider status: ${providerStatus}.` : '';
  const error = new Error(`No configured Cloudflare token can read Pages project ${projectName}.${suffix}`);
  error.providerStatus = Number.isInteger(providerStatus) ? providerStatus : null;
  error.providerCodes = providerCodes;
  throw error;
}

function parseArgs(argv) {
  const parsed = { output: DEFAULT_OUTPUT, expectSnapshot: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      parsed.output = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--expect-snapshot') {
      parsed.expectSnapshot = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  return parsed;
}

function configuredCredentialSources(env) {
  return [
    env.CLOUDFLARE_PAGES_READ_API_TOKEN ? 'CLOUDFLARE_PAGES_READ_API_TOKEN' : null,
    env.CLOUDFLARE_API_TOKEN ? 'CLOUDFLARE_API_TOKEN' : null,
    env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN ? 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN' : null,
  ].filter(Boolean);
}

async function retainPreReadFailure({
  output,
  env,
  projectName,
  expectedBranch,
  expectedRepoOwner,
  expectedRepoName,
  expectedCanonicalDomain,
  code,
  error,
}) {
  const providerStatus = Number(error?.providerStatus);
  const providerCodes = Array.isArray(error?.providerCodes)
    ? error.providerCodes.filter((providerCode) => Number.isInteger(providerCode))
    : [];
  const receipt = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    mutationPerformed: false,
    status: 'blocked',
    credentialSource: null,
    credentialConfiguredSources: configuredCredentialSources(env),
    project: projectName,
    expectedProductionBranch: expectedBranch,
    expectedRepoOwner,
    expectedRepoName,
    expectedCanonicalDomain,
    observed: null,
    fingerprint: null,
    verified: false,
    failures: [code],
    expectedSnapshotFingerprint: null,
    snapshotMatched: null,
    failure: {
      code,
      message: error instanceof Error ? error.message : String(error),
      providerStatus: Number.isInteger(providerStatus) ? providerStatus : null,
      providerCodes,
    },
  };

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return receipt;
}

export async function verifyPagesBranchAuthority({ argv = [], env = process.env } = {}) {
  const { output, expectSnapshot } = parseArgs(argv);
  const accountId = clean(env.CLOUDFLARE_ACCOUNT_ID);
  const projectName = clean(env.CLOUDFLARE_PAGES_PROJECT) || DEFAULT_PROJECT;
  const expectedBranch = clean(env.CLOUDFLARE_PAGES_PRODUCTION_BRANCH) || DEFAULT_BRANCH;
  const expectedRepoOwner = clean(env.CLOUDFLARE_PAGES_REPO_OWNER) || DEFAULT_REPO_OWNER;
  const expectedRepoName = clean(env.CLOUDFLARE_PAGES_REPO_NAME) || DEFAULT_REPO_NAME;
  const expectedCanonicalDomain = clean(env.CLOUDFLARE_PAGES_CANONICAL_DOMAIN) || DEFAULT_CANONICAL_DOMAIN;

  if (!accountId) {
    const error = new Error('CLOUDFLARE_ACCOUNT_ID is required for Pages readback.');
    await retainPreReadFailure({
      output,
      env,
      projectName,
      expectedBranch,
      expectedRepoOwner,
      expectedRepoName,
      expectedCanonicalDomain,
      code: 'configuration-missing',
      error,
    });
    throw error;
  }

  let credential;
  try {
    credential = await selectPagesCredential(env, accountId, projectName);
  } catch (error) {
    await retainPreReadFailure({
      output,
      env,
      projectName,
      expectedBranch,
      expectedRepoOwner,
      expectedRepoName,
      expectedCanonicalDomain,
      code: configuredCredentialSources(env).length === 0 ? 'credential-not-configured' : 'credential-read-failed',
      error,
    });
    throw error;
  }

  const verdict = evaluatePagesBranchAuthority(credential.project, {
    expectedProject: projectName,
    expectedBranch,
    expectedRepoOwner,
    expectedRepoName,
    expectedCanonicalDomain,
  });

  let expectedSnapshotFingerprint = null;
  let snapshotMatched = null;
  if (expectSnapshot) {
    const previous = JSON.parse(await readFile(expectSnapshot, 'utf8'));
    expectedSnapshotFingerprint = clean(previous?.fingerprint) || null;
    snapshotMatched = Boolean(expectedSnapshotFingerprint && expectedSnapshotFingerprint === verdict.fingerprint);
  }

  const receipt = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    mutationPerformed: false,
    credentialSource: credential.source,
    project: projectName,
    expectedProductionBranch: expectedBranch,
    expectedRepoOwner,
    expectedRepoName,
    expectedCanonicalDomain,
    ...verdict,
    expectedSnapshotFingerprint,
    snapshotMatched,
  };

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  if (!verdict.verified) throw new Error(`CLOUDFLARE_PAGES_BRANCH_AUTHORITY_NOT_VERIFIED: ${verdict.failures.join(',')}`);
  if (expectSnapshot && snapshotMatched !== true) throw new Error('CLOUDFLARE_PAGES_BRANCH_AUTHORITY_DRIFTED');

  console.log(`CLOUDFLARE_PAGES_BRANCH_AUTHORITY_VERIFIED project=${projectName} repo=${expectedRepoOwner}/${expectedRepoName} domain=${expectedCanonicalDomain} production_branch=${verdict.observed.productionBranch} preview=${verdict.observed.previewDeploymentSetting} credential=${credential.source}`);
  return receipt;
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    await verifyPagesBranchAuthority({ argv, env });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) await main();