import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.cloudflare.com/client/v4';
const clean = (value) => String(value ?? '').trim();
const accountId = clean(process.env.CLOUDFLARE_ACCOUNT_ID);
const dedicatedTokenRaw = String(process.env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN ?? '');
let token = '';
let prefetchedScripts = null;
const evidencePath = clean(process.env.EVIDENCE_PATH) || 'artifacts/cloudflare-worker-branch-authority.json';
const separateWorker = 'bip';
const previousSeparateWorker = 'sekret';
const productionWorker = 'sekret-backend';
const alphaWorker = 'sekret-backend-alpha';
const pagesProject = 'sekret-bip';
const terminal = new Set(['success', 'fail', 'skipped', 'cancelled', 'terminated']);
const active = (rows) => (Array.isArray(rows) ? rows : []).filter((row) => !row?.deleted_on);

const receipt = {
  schemaVersion: 11,
  generatedAt: new Date().toISOString(),
  trustedGitRef: process.env.GITHUB_REF || null,
  trustedGitSha: process.env.GITHUB_SHA || null,
  mode: 'read-only',
  mutationPerformed: false,
  status: 'started',
  failure: null,
  credential: {
    configuredSources: [dedicatedTokenRaw ? 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN' : null].filter(Boolean),
    selectedSource: null,
    selectedShape: null,
    attempts: [],
  },
  providerTopology: {
    workers: [
      { name: separateWorker, previousName: previousSeparateWorker, role: 'separate-protected', mutationAuthorized: false },
      { name: productionWorker, role: 'production' },
      { name: alphaWorker, role: 'founder-gated-alpha', mutationAuthorized: false },
    ],
    pages: [{ name: pagesProject, role: 'frontend', mutationAuthorized: false }],
  },
  separateWorker: {
    name: separateWorker,
    previousName: previousSeparateWorker,
    scriptTag: null,
    mutationAuthorized: false,
    bindingAuthority: 'provider-readback-required',
    activeTriggerCount: null,
    branchIncludes: [],
    branchExcludes: [],
    deployCommand: null,
    buildCommand: null,
    activeNonMainBuildCount: null,
    buildConnectionState: 'unknown',
    verifiedSafeBuildAuthority: false,
  },
  productionWorker: {
    name: productionWorker,
    scriptTag: null,
    activeTriggerCount: null,
    branchIncludes: [],
    branchExcludes: [],
    deployCommand: null,
    buildCommand: null,
    activeNonMainBuildCount: null,
    verifiedMainOnly: false,
  },
  alphaWorker: {
    name: alphaWorker,
    scriptTag: null,
    activeTriggerCount: null,
    founderGatedObservationOnly: true,
  },
  pagesProject: {
    name: pagesProject,
    verification: 'load-bearing-provider-readback',
    mutationAuthorized: false,
  },
  separateWorkerObserved: false,
  workersAuthorityVerified: false,
};

function writeReceipt() {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  receipt.updatedAt = new Date().toISOString();
  fs.writeFileSync(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function publicProviderPath(providerPath) {
  const raw = clean(providerPath);
  if (!raw) return null;
  return accountId ? raw.split(accountId).join(':account') : raw;
}

function firstProviderErrorCode(payload) {
  const raw = payload?.errors?.[0]?.code;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function fail(code, message, details = {}) {
  receipt.status = 'blocked';
  receipt.failure = { code, message, ...details };
  writeReceipt();
  throw new Error(message);
}

function inspectToken(rawValue, source) {
  if (!rawValue) return { ok: false, source, shape: 'missing', code: 'token-not-configured' };
  if (rawValue !== rawValue.trim()) return { ok: false, source, shape: 'invalid', code: 'token-leading-or-trailing-whitespace' };
  if (/[^\x21-\x7e]/.test(rawValue) || /\s/.test(rawValue)) return { ok: false, source, shape: 'invalid', code: 'token-non-ascii-or-whitespace' };
  if (/^Bearer\s+/i.test(rawValue)) return { ok: false, source, shape: 'invalid', code: 'token-bearer-prefix-stored' };
  if (/^["']|["']$/.test(rawValue)) return { ok: false, source, shape: 'invalid', code: 'token-quoted-secret' };
  if (/^[A-Z_][A-Z0-9_]*=/.test(rawValue)) return { ok: false, source, shape: 'invalid', code: 'token-variable-assignment-stored' };
  if (rawValue.startsWith('cfat_')) return { ok: false, source, shape: 'account-scoped', code: 'workers-builds-account-token-unsupported' };

  return {
    ok: true,
    source,
    shape: rawValue.startsWith('cfut_') ? 'user-prefixed' : 'legacy-opaque',
    token: rawValue,
  };
}

async function verifyApiToken(inspected) {
  let response;
  try {
    response = await fetch(`${API}/user/tokens/verify`, {
      headers: { Authorization: `Bearer ${inspected.token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    receipt.credential.attempts.push({
      source: inspected.source,
      shape: inspected.shape,
      probe: 'token-verify-user',
      result: 'request-failed',
      failureCode: 'provider-request-failed',
    });
    return {
      ok: false,
      code: 'token-verify-request-failed',
      message: `${inspected.source} could not be verified before provider response.`,
      shape: inspected.shape,
      providerStatus: null,
      providerCode: null,
      tokenStatus: null,
    };
  }

  const payload = await response.json().catch(() => null);
  const providerCode = firstProviderErrorCode(payload);
  const tokenStatus = clean(payload?.result?.status).toLowerCase() || null;
  const verified = response.ok && payload?.success !== false && tokenStatus === 'active';

  receipt.credential.attempts.push({
    source: inspected.source,
    shape: inspected.shape,
    probe: 'token-verify-user',
    result: verified ? 'accepted' : 'rejected',
    providerStatus: response.status,
    providerCode,
    tokenStatus,
  });

  if (!verified) {
    return {
      ok: false,
      code: 'token-not-active-or-invalid',
      message: `${inspected.source} is not an active Cloudflare user API token; verify status ${response.status}${providerCode === null ? '' : ` code ${providerCode}`}.`,
      shape: inspected.shape,
      providerStatus: response.status,
      providerCode,
      tokenStatus,
    };
  }

  return { ok: true };
}

async function probeWorkersRead(rawValue, source) {
  const inspected = inspectToken(rawValue, source);
  if (!inspected.ok) {
    receipt.credential.attempts.push({ source, shape: inspected.shape, probe: 'workers-scripts', result: 'rejected-preflight', failureCode: inspected.code });
    return { ok: false, code: inspected.code, message: `${source} failed Workers Builds token preflight.`, shape: inspected.shape };
  }

  const tokenVerification = await verifyApiToken(inspected);
  if (!tokenVerification.ok) return tokenVerification;

  const providerPath = `/accounts/${accountId}/workers/scripts`;
  let response;
  try {
    response = await fetch(`${API}${providerPath}`, {
      headers: { Authorization: `Bearer ${inspected.token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    receipt.credential.attempts.push({ source, shape: inspected.shape, probe: 'workers-scripts', result: 'request-failed', failureCode: 'provider-request-failed' });
    return { ok: false, code: 'provider-request-failed', message: `${source} failed the Workers scripts capability probe before provider response.`, shape: inspected.shape, providerStatus: null, providerCode: null };
  }

  const payload = await response.json().catch(() => null);
  const providerCode = firstProviderErrorCode(payload);
  if (!response.ok || payload?.success === false || !Array.isArray(payload?.result)) {
    receipt.credential.attempts.push({ source, shape: inspected.shape, probe: 'workers-scripts', result: 'provider-http-failure', failureCode: 'provider-http-failure', providerStatus: response.status, providerCode });
    return {
      ok: false,
      code: 'provider-http-failure',
      message: `${source} is active but cannot read the Workers scripts collection; provider status ${response.status}${providerCode === null ? '' : ` code ${providerCode}`}.`,
      shape: inspected.shape,
      providerStatus: response.status,
      providerCode,
      tokenStatus: 'active',
    };
  }

  receipt.credential.attempts.push({ source, shape: inspected.shape, probe: 'workers-scripts', result: 'accepted', providerStatus: response.status, providerCode: null });
  return { ok: true, source, shape: inspected.shape, token: inspected.token, scripts: payload.result };
}

async function selectCredential() {
  if (!dedicatedTokenRaw) {
    fail('configuration-missing', 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN is required.', {
      field: 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN',
    });
  }

  const result = await probeWorkersRead(dedicatedTokenRaw, 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN');
  if (!result.ok) {
    fail(result.code || 'token-selection-failed', result.message || 'The dedicated Workers Builds API token cannot read the Workers scripts collection.', {
      credentialSource: 'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN',
      tokenShape: result.shape || null,
      providerStatus: result.providerStatus ?? null,
      providerCode: result.providerCode ?? null,
      tokenStatus: result.tokenStatus ?? null,
    });
  }

  token = result.token;
  prefetchedScripts = result.scripts;
  receipt.credential.selectedSource = result.source;
  receipt.credential.selectedShape = result.shape;
  receipt.failure = null;
  receipt.status = 'started';
  writeReceipt();
}

async function get(providerPath) {
  const retainedProviderPath = publicProviderPath(providerPath);
  let response;
  try {
    response = await fetch(`${API}${providerPath}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  } catch {
    fail('provider-request-failed', `GET ${retainedProviderPath} failed before provider response`, { providerPath: retainedProviderPath });
  }

  const payload = await response.json().catch(() => null);
  const providerCode = firstProviderErrorCode(payload);
  if (!response.ok || payload?.success === false) {
    fail('provider-http-failure', `GET ${retainedProviderPath} failed with provider status ${response.status}${providerCode === null ? '' : ` code ${providerCode}`}`, {
      providerPath: retainedProviderPath,
      providerStatus: response.status,
      providerCode,
    });
  }
  return payload?.result;
}

writeReceipt();
if (!accountId) fail('configuration-missing', 'CLOUDFLARE_ACCOUNT_ID is required.', { field: 'CLOUDFLARE_ACCOUNT_ID' });
await selectCredential();

const scripts = prefetchedScripts;
const findWorker = (name) => (Array.isArray(scripts) ? scripts : []).filter((row) => clean(row?.id) === name);
const separateMatches = findWorker(separateWorker);
const productionMatches = findWorker(productionWorker);
const alphaMatches = findWorker(alphaWorker);
if (separateMatches.length !== 1) fail('worker-identity-mismatch', `${separateWorker}: expected exactly one Worker, found ${separateMatches.length}.`, { worker: separateWorker, previousName: previousSeparateWorker, observedCount: separateMatches.length });
if (productionMatches.length !== 1) fail('worker-identity-mismatch', `${productionWorker}: expected exactly one Worker, found ${productionMatches.length}.`, { worker: productionWorker, observedCount: productionMatches.length });
if (alphaMatches.length !== 1) fail('worker-identity-mismatch', `${alphaWorker}: expected exactly one Worker, found ${alphaMatches.length}.`, { worker: alphaWorker, observedCount: alphaMatches.length });

const separateTag = clean(separateMatches[0]?.tag);
const productionTag = clean(productionMatches[0]?.tag);
const alphaTag = clean(alphaMatches[0]?.tag);
if (!separateTag || !productionTag || !alphaTag) fail('worker-tag-missing', 'All protected Worker identities must expose immutable script tags.');

receipt.separateWorker.scriptTag = separateTag;
receipt.separateWorkerObserved = true;
receipt.productionWorker.scriptTag = productionTag;
receipt.alphaWorker.scriptTag = alphaTag;
writeReceipt();

const separateTriggerRows = await get(`/accounts/${accountId}/builds/workers/${separateTag}/triggers`);
const separateBuildRows = await get(`/accounts/${accountId}/builds/workers/${separateTag}/builds?per_page=50`);
const separateActiveTriggers = active(separateTriggerRows);
const separateTrigger = separateActiveTriggers.length === 1 ? separateActiveTriggers[0] : null;
const separateIncludes = Array.isArray(separateTrigger?.branch_includes) ? separateTrigger.branch_includes.map(clean) : [];
const separateExcludes = Array.isArray(separateTrigger?.branch_excludes) ? separateTrigger.branch_excludes.map(clean) : [];
const separateDeployCommand = clean(separateTrigger?.deploy_command);
const separateBuildCommand = clean(separateTrigger?.build_command);
const separateActiveNonMainBuilds = (Array.isArray(separateBuildRows) ? separateBuildRows : []).filter((build) => {
  const branch = clean(build?.build_trigger_metadata?.branch);
  const outcome = clean(build?.build_outcome).toLowerCase();
  return branch && branch !== 'main' && !terminal.has(outcome);
});
const separateBuildConnectionDisabled = separateActiveTriggers.length === 0;
const separateBuildConnectionMainOnly = separateActiveTriggers.length === 1 && JSON.stringify(separateIncludes) === JSON.stringify(['main']) && separateExcludes.length === 0;
const separateVerifiedSafeBuildAuthority = (separateBuildConnectionDisabled || separateBuildConnectionMainOnly) && separateActiveNonMainBuilds.length === 0;

const triggerRows = await get(`/accounts/${accountId}/builds/workers/${productionTag}/triggers`);
const buildRows = await get(`/accounts/${accountId}/builds/workers/${productionTag}/builds?per_page=50`);
const activeTriggers = active(triggerRows);
const productionTrigger = activeTriggers.length === 1 ? activeTriggers[0] : null;
const includes = Array.isArray(productionTrigger?.branch_includes) ? productionTrigger.branch_includes.map(clean) : [];
const excludes = Array.isArray(productionTrigger?.branch_excludes) ? productionTrigger.branch_excludes.map(clean) : [];
const deployCommand = clean(productionTrigger?.deploy_command);
const buildCommand = clean(productionTrigger?.build_command);
const activeNonMainBuilds = (Array.isArray(buildRows) ? buildRows : []).filter((build) => {
  const branch = clean(build?.build_trigger_metadata?.branch);
  const outcome = clean(build?.build_outcome).toLowerCase();
  return branch && branch !== 'main' && !terminal.has(outcome);
});
const verifiedMainOnly = activeTriggers.length === 1 &&
  JSON.stringify(includes) === JSON.stringify(['main']) &&
  excludes.length === 0 &&
  deployCommand === 'npm run deploy:api:production' &&
  buildCommand === '' &&
  activeNonMainBuilds.length === 0;
const alphaTriggers = await get(`/accounts/${accountId}/builds/workers/${alphaTag}/triggers`);

receipt.separateWorker.activeTriggerCount = separateActiveTriggers.length;
receipt.separateWorker.branchIncludes = separateIncludes;
receipt.separateWorker.branchExcludes = separateExcludes;
receipt.separateWorker.deployCommand = separateDeployCommand;
receipt.separateWorker.buildCommand = separateBuildCommand;
receipt.separateWorker.activeNonMainBuildCount = separateActiveNonMainBuilds.length;
receipt.separateWorker.buildConnectionState = separateBuildConnectionDisabled ? 'disabled' : separateBuildConnectionMainOnly ? 'main-only' : 'unsafe-or-ambiguous';
receipt.separateWorker.verifiedSafeBuildAuthority = separateVerifiedSafeBuildAuthority;
receipt.productionWorker.activeTriggerCount = activeTriggers.length;
receipt.productionWorker.branchIncludes = includes;
receipt.productionWorker.branchExcludes = excludes;
receipt.productionWorker.deployCommand = deployCommand;
receipt.productionWorker.buildCommand = buildCommand;
receipt.productionWorker.activeNonMainBuildCount = activeNonMainBuilds.length;
receipt.productionWorker.verifiedMainOnly = verifiedMainOnly;
receipt.alphaWorker.activeTriggerCount = active(alphaTriggers).length;
receipt.workersAuthorityVerified = verifiedMainOnly && separateVerifiedSafeBuildAuthority;

if (!separateVerifiedSafeBuildAuthority) fail('separate-worker-build-authority-not-verified', 'CLOUDFLARE_BIP_WORKER_BUILD_AUTHORITY_NOT_VERIFIED');
if (!verifiedMainOnly) fail('production-worker-branch-authority-not-verified', 'CLOUDFLARE_PRODUCTION_WORKER_BRANCH_AUTHORITY_NOT_VERIFIED');

receipt.status = 'verified';
receipt.failure = null;
writeReceipt();
console.log('CLOUDFLARE_PROTECTED_WORKER_TOPOLOGY_VERIFIED_READ_ONLY');
