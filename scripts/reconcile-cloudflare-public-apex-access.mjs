import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const PROVIDER_REQUEST_TIMEOUT_MS = 10_000;
const RUNTIME_REQUEST_TIMEOUT_MS = 10_000;
const APPLICATIONS_PAGE_SIZE = 100;
const MAX_APPLICATION_PAGES = 100;
const CREATE_RECOVERY_POLL_ATTEMPTS = 6;
const CREATE_RECOVERY_POLL_DELAY_MS = 2_000;
const PROVEN_NO_MUTATION_STATUSES = new Set([
  'blocked-duplicate-managed-apps',
  'blocked-managed-app-destination-drift',
  'blocked-managed-app-policy-drift',
  'blocked-existing-public-app',
  'planned-existing-bypass',
  'planned-create-public-bypass',
  'already-reconciled',
  'rollback-not-required',
]);
const PROVEN_MUTATION_ATTRIBUTIONS = new Set(['provider-returned-id', 'correlation-readback']);
export const DEFAULT_TARGET_HOSTNAME = 'sekretbip.net';
export const DEFAULT_TARGET_URL = 'https://sekretbip.net/';
export const DEFAULT_APPLICATION_NAME = 'sekretbip.net - public apex bypass';
export const DEFAULT_EVIDENCE_PATH = 'artifacts/cloudflare-public-apex-access.json';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function configFromEnv(env = process.env) {
  return {
    token: clean(env.CLOUDFLARE_ACCESS_API_TOKEN),
    accountId: clean(env.CLOUDFLARE_ACCOUNT_ID),
    targetHostname: clean(env.BIP_PUBLIC_HOSTNAME) || DEFAULT_TARGET_HOSTNAME,
    targetUrl: clean(env.BIP_PUBLIC_URL) || DEFAULT_TARGET_URL,
    applicationName: clean(env.BIP_PUBLIC_ACCESS_APP_NAME) || DEFAULT_APPLICATION_NAME,
    blockingAud: clean(env.BIP_PUBLIC_ACCESS_BLOCKING_AUD),
    evidencePath: clean(env.BIP_PUBLIC_ACCESS_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH,
  };
}

function providerCodes(payload) {
  return Array.isArray(payload?.errors)
    ? payload.errors.map((item) => item?.code).filter((code) => Number.isInteger(code)).slice(0, 5)
    : [];
}

function failureSummary(error) {
  return {
    code: error instanceof Error ? error.message : 'UNKNOWN_FAILURE',
    status: Number.isInteger(error?.providerStatus) ? error.providerStatus : null,
    providerCodes: Array.isArray(error?.providerCodes) ? error.providerCodes : [],
  };
}

async function cfRequest(config, requestPath, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`${API_BASE}${requestPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal || AbortSignal.timeout(options.timeoutMs || PROVIDER_REQUEST_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const error = new Error(`Cloudflare provider request failed with status ${response.status}.`);
    error.providerStatus = response.status;
    error.providerCodes = providerCodes(payload);
    throw error;
  }
  return payload;
}

function normalizePublicUri(value) {
  return clean(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

export function publicDestinationTargetsHost(destination, hostname) {
  if (clean(destination?.type).toLowerCase() !== 'public') return false;
  const uri = normalizePublicUri(destination?.uri);
  const target = clean(hostname).toLowerCase();
  return uri === target || uri === `${target}/*` || uri.startsWith(`${target}/`);
}

export function appHasExactPublicDestination(app, hostname) {
  return (Array.isArray(app?.destinations) ? app.destinations : []).some((destination) =>
    publicDestinationTargetsHost(destination, hostname),
  );
}

export function appHasOnlyManagedPublicDestination(app, hostname) {
  const destinations = Array.isArray(app?.destinations) ? app.destinations : [];
  if (destinations.length !== 1) return false;
  const destination = destinations[0];
  if (clean(destination?.type).toLowerCase() !== 'public') return false;
  return normalizePublicUri(destination?.uri) === `${clean(hostname).toLowerCase()}/*`;
}

export function isCloudflareAccessUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return (
      url.hostname === 'cloudflareaccess.com'
      || url.hostname.endsWith('.cloudflareaccess.com')
      || url.pathname.toLowerCase().startsWith('/cdn-cgi/access/')
    );
  } catch {
    return false;
  }
}

export function isEveryoneBypassPolicy(policy) {
  if (clean(policy?.decision).toLowerCase() !== 'bypass') return false;
  const include = Array.isArray(policy?.include) ? policy.include : [];
  const require = Array.isArray(policy?.require) ? policy.require : [];
  const exclude = Array.isArray(policy?.exclude) ? policy.exclude : [];
  if (require.length > 0 || exclude.length > 0) return false;
  return include.some(
    (rule) => rule && typeof rule === 'object' && rule.everyone && typeof rule.everyone === 'object',
  );
}

function correlatedPolicyName(correlation) {
  return `Bypass public Se’kret apex [run:${correlation}]`;
}

function isCorrelatedEveryoneBypassPolicy(policy, correlation) {
  return clean(policy?.name) === correlatedPolicyName(correlation) && isEveryoneBypassPolicy(policy);
}

export function selectBlockingApplication(apps, blockingAud) {
  const aud = clean(blockingAud);
  if (!aud) return null;
  const matches = (Array.isArray(apps) ? apps : []).filter((app) => clean(app?.aud) === aud);
  if (matches.length > 1) throw new Error('BLOCKING_AUD_NOT_UNIQUE');
  return matches[0] || null;
}

export async function listApplications(config) {
  const applications = [];
  for (let page = 1; page <= MAX_APPLICATION_PAGES; page += 1) {
    const payload = await cfRequest(
      config,
      `/accounts/${config.accountId}/access/apps?per_page=${APPLICATIONS_PAGE_SIZE}&page=${page}`,
    );
    const result = Array.isArray(payload?.result) ? payload.result : [];
    applications.push(...result);
    const totalPages = Number(payload?.result_info?.total_pages);
    const hasAuthoritativeTotalPages = Number.isInteger(totalPages) && totalPages >= 1;
    if (hasAuthoritativeTotalPages) {
      if (page >= totalPages) return applications;
      continue;
    }
    if (result.length < APPLICATIONS_PAGE_SIZE) return applications;
  }
  throw new Error('ACCESS_APPLICATION_INVENTORY_PAGE_LIMIT_EXCEEDED');
}

async function listPolicies(config, appId) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/access/apps/${encodeURIComponent(appId)}/policies?per_page=1000`,
  );
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function createPublicBypassApplication(config, correlation) {
  const payload = await cfRequest(config, `/accounts/${config.accountId}/access/apps`, {
    method: 'POST',
    body: {
      name: config.applicationName,
      type: 'self_hosted',
      domain: config.targetHostname,
      session_duration: '24h',
      destinations: [{ type: 'public', uri: `${config.targetHostname}/*` }],
      policies: [
        {
          name: correlatedPolicyName(correlation),
          decision: 'bypass',
          include: [{ everyone: {} }],
          precedence: 1,
        },
      ],
    },
  });
  if (!payload?.result?.id) throw new Error('CREATED_ACCESS_APP_ID_MISSING');
  return payload.result;
}

async function findCorrelatedManagedCandidates(config, preCreateAppIds, correlation) {
  const previousIds = new Set(Array.isArray(preCreateAppIds) ? preCreateAppIds.map(clean).filter(Boolean) : []);
  const apps = await listApplications(config);
  const candidates = apps.filter((app) => {
    const appId = clean(app?.id);
    return appId
      && !previousIds.has(appId)
      && clean(app?.name) === config.applicationName
      && appHasOnlyManagedPublicDestination(app, config.targetHostname);
  });
  const matches = [];
  for (const candidate of candidates) {
    const policies = await listPolicies(config, candidate.id);
    if (policies.some((policy) => isCorrelatedEveryoneBypassPolicy(policy, correlation))) {
      matches.push(candidate);
    }
  }
  return matches;
}

async function pollCorrelatedManagedCandidate(
  config,
  preCreateAppIds,
  correlation,
  attempts = CREATE_RECOVERY_POLL_ATTEMPTS,
  delayMs = CREATE_RECOVERY_POLL_DELAY_MS,
) {
  let observedManagedCandidateCount = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const matches = await findCorrelatedManagedCandidates(config, preCreateAppIds, correlation);
    observedManagedCandidateCount = matches.length;
    if (matches.length === 1) {
      return { candidate: matches[0], observedManagedCandidateCount };
    }
    if (matches.length > 1) {
      throw new Error('CORRELATED_MANAGED_ACCESS_APP_NOT_UNIQUE');
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { candidate: null, observedManagedCandidateCount };
}

async function deleteApplication(config, appId) {
  await cfRequest(config, `/accounts/${config.accountId}/access/apps/${encodeURIComponent(appId)}`, {
    method: 'DELETE',
  });
}

function finalOrigin(value, fallback) {
  try {
    return new URL(value || fallback).origin;
  } catch {
    return null;
  }
}

async function runtimeProbe(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(RUNTIME_REQUEST_TIMEOUT_MS),
  });
  const finalUrl = response.url || url;
  return {
    status: response.status,
    redirected: response.redirected === true,
    accessIntercepted: isCloudflareAccessUrl(finalUrl),
    finalOrigin: finalOrigin(finalUrl, url),
    contentType: response.headers.get('content-type') || '',
  };
}

async function waitForPublicRuntime(config, attempts = 12, delayMs = 5000) {
  let lastProbe = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastProbe = await runtimeProbe(config.targetUrl);
    console.log(
      `PUBLIC_APEX_PROBE attempt=${attempt} status=${lastProbe.status} access_intercepted=${lastProbe.accessIntercepted}`,
    );
    if (!lastProbe.accessIntercepted && lastProbe.status >= 200 && lastProbe.status < 400) {
      return lastProbe;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw Object.assign(new Error('PUBLIC_APEX_STILL_ACCESS_INTERCEPTED_OR_UNHEALTHY'), { lastProbe });
}

function summarizeApp(app, { includeId = false } = {}) {
  if (!app) return null;
  return {
    ...(includeId ? { id: clean(app.id) || null } : {}),
    name: clean(app.name) || null,
    type: clean(app.type) || null,
    domain: clean(app.domain) || null,
    destinationTypes: (Array.isArray(app.destinations) ? app.destinations : [])
      .map((destination) => clean(destination?.type).toLowerCase())
      .filter(Boolean),
  };
}

async function writeEvidence(config, payload) {
  const parent = dirname(config.evidencePath);
  if (parent && parent !== '.') await mkdir(parent, { recursive: true });
  await writeFile(
    config.evidencePath,
    `${JSON.stringify({ schemaVersion: 2, generatedAt: new Date().toISOString(), ...payload }, null, 2)}\n`,
    'utf8',
  );
}

function baseEvidence(config, apply) {
  return {
    targetHostname: config.targetHostname,
    applicationName: config.applicationName,
    blockingAudConfigured: Boolean(config.blockingAud),
    applyRequested: apply === true,
    mutationPerformed: false,
    rollbackPerformed: false,
  };
}

function requireProviderConfig(config) {
  if (!config.token || !config.accountId) throw new Error('CLOUDFLARE_ACCESS_CONFIGURATION_MISSING');
}

export async function reconcilePublicApexAccess({ env = process.env, apply = false } = {}) {
  const config = configFromEnv(env);
  const evidenceBase = baseEvidence(config, apply);

  if (!config.token || !config.accountId) {
    await writeEvidence(config, { ...evidenceBase, status: 'configuration-missing' });
    throw new Error('CLOUDFLARE_ACCESS_CONFIGURATION_MISSING');
  }

  const runtimeBefore = await runtimeProbe(config.targetUrl);
  const apps = await listApplications(config);
  const blockingApp = selectBlockingApplication(apps, config.blockingAud);
  const managedApps = apps.filter((app) => clean(app?.name) === config.applicationName);
  const exactPublicApps = apps.filter((app) => appHasExactPublicDestination(app, config.targetHostname));
  const existingManaged = managedApps.length === 1 ? managedApps[0] : null;

  if (managedApps.length > 1) {
    await writeEvidence(config, {
      ...evidenceBase,
      status: 'blocked-duplicate-managed-apps',
      runtimeBefore,
      blockingApplication: summarizeApp(blockingApp),
      managedApplicationCount: managedApps.length,
    });
    throw new Error('DUPLICATE_MANAGED_PUBLIC_BYPASS_APPS');
  }

  if (existingManaged) {
    if (!appHasOnlyManagedPublicDestination(existingManaged, config.targetHostname)) {
      await writeEvidence(config, {
        ...evidenceBase,
        status: 'blocked-managed-app-destination-drift',
        runtimeBefore,
        blockingApplication: summarizeApp(blockingApp),
        managedApplication: summarizeApp(existingManaged, { includeId: true }),
      });
      throw new Error('MANAGED_PUBLIC_BYPASS_DESTINATION_DRIFT');
    }

    const policies = await listPolicies(config, existingManaged.id);
    if (!policies.some(isEveryoneBypassPolicy)) {
      await writeEvidence(config, {
        ...evidenceBase,
        status: 'blocked-managed-app-policy-drift',
        runtimeBefore,
        blockingApplication: summarizeApp(blockingApp),
        managedApplication: summarizeApp(existingManaged, { includeId: true }),
      });
      throw new Error('MANAGED_PUBLIC_BYPASS_POLICY_DRIFT');
    }

    if (!apply) {
      await writeEvidence(config, {
        ...evidenceBase,
        status: 'planned-existing-bypass',
        runtimeBefore,
        blockingApplication: summarizeApp(blockingApp),
        managedApplication: summarizeApp(existingManaged, { includeId: true }),
      });
      return { status: 'planned-existing-bypass', runtimeBefore };
    }

    const runtimeAfter = await waitForPublicRuntime(config);
    await writeEvidence(config, {
      ...evidenceBase,
      status: 'already-reconciled',
      runtimeBefore,
      runtimeAfter,
      blockingApplication: summarizeApp(blockingApp),
      managedApplication: summarizeApp(existingManaged, { includeId: true }),
    });
    return { status: 'already-reconciled', runtimeAfter };
  }

  const foreignExactPublicApps = exactPublicApps.filter((app) => clean(app?.name) !== config.applicationName);
  if (foreignExactPublicApps.length > 0) {
    await writeEvidence(config, {
      ...evidenceBase,
      status: 'blocked-existing-public-app',
      runtimeBefore,
      blockingApplication: summarizeApp(blockingApp),
      foreignPublicApplications: foreignExactPublicApps.map((app) => summarizeApp(app)),
    });
    throw new Error('EXISTING_PUBLIC_ACCESS_APP_REQUIRES_MANUAL_REVIEW');
  }

  await writeEvidence(config, {
    ...evidenceBase,
    status: apply ? 'pre-apply' : 'planned-create-public-bypass',
    runtimeBefore,
    blockingApplication: summarizeApp(blockingApp),
    plannedDestination: `${config.targetHostname}/*`,
    plannedPolicy: 'bypass:everyone',
  });

  if (!apply) return { status: 'planned-create-public-bypass', runtimeBefore };

  const createCorrelation = randomUUID();
  const preCreateAppIds = apps.map((app) => clean(app?.id)).filter(Boolean);
  await writeEvidence(config, {
    ...evidenceBase,
    status: 'create-pending',
    mutationState: 'pending',
    mutationAttribution: 'correlation-pending',
    createCorrelation,
    preCreateAppIds,
    runtimeBefore,
    blockingApplication: summarizeApp(blockingApp),
  });

  let createdApp = null;
  let mutationAttribution = null;
  let ambiguousCreateFailure = null;
  try {
    createdApp = await createPublicBypassApplication(config, createCorrelation);
    mutationAttribution = 'provider-returned-id';
  } catch (createError) {
    ambiguousCreateFailure = failureSummary(createError);
    let observedManagedCandidateCount = 0;
    let recoveryFailure = null;
    try {
      const recovery = await pollCorrelatedManagedCandidate(config, preCreateAppIds, createCorrelation);
      createdApp = recovery.candidate;
      observedManagedCandidateCount = recovery.observedManagedCandidateCount;
      if (createdApp) mutationAttribution = 'correlation-readback';
    } catch (error) {
      recoveryFailure = failureSummary(error);
    }

    if (!createdApp) {
      await writeEvidence(config, {
        ...evidenceBase,
        status: 'mutation-state-unknown',
        mutationState: 'unknown',
        mutationAttribution: 'unproven',
        createCorrelation,
        preCreateAppIds,
        runtimeBefore,
        blockingApplication: summarizeApp(blockingApp),
        observedManagedCandidateCount,
        failure: ambiguousCreateFailure,
        ...(recoveryFailure ? { recoveryFailure } : {}),
      });
      throw createError;
    }
  }

  await writeEvidence(config, {
    ...evidenceBase,
    status: 'created-awaiting-proof',
    mutationPerformed: true,
    mutationAttribution,
    createCorrelation,
    preCreateAppIds,
    ...(ambiguousCreateFailure ? { ambiguousCreateFailure } : {}),
    runtimeBefore,
    blockingApplication: summarizeApp(blockingApp),
    managedApplication: summarizeApp(createdApp, { includeId: true }),
  });

  try {
    const policies = await listPolicies(config, createdApp.id);
    if (!appHasOnlyManagedPublicDestination(createdApp, config.targetHostname)) {
      throw new Error('CREATED_APP_DESTINATION_MISMATCH');
    }
    if (!policies.some(isEveryoneBypassPolicy)) {
      throw new Error('CREATED_APP_BYPASS_POLICY_MISSING');
    }

    const runtimeAfter = await waitForPublicRuntime(config);
    await writeEvidence(config, {
      ...evidenceBase,
      status: 'reconciled',
      mutationPerformed: true,
      mutationAttribution,
      createCorrelation,
      preCreateAppIds,
      ...(ambiguousCreateFailure ? { ambiguousCreateFailure } : {}),
      runtimeBefore,
      runtimeAfter,
      blockingApplication: summarizeApp(blockingApp),
      managedApplication: summarizeApp(createdApp, { includeId: true }),
    });
    return { status: 'reconciled', runtimeAfter, appId: createdApp.id };
  } catch (error) {
    let rollbackPerformed = false;
    if (createdApp?.id) {
      try {
        await deleteApplication(config, createdApp.id);
        rollbackPerformed = true;
      } catch {
        rollbackPerformed = false;
      }
    }
    await writeEvidence(config, {
      ...evidenceBase,
      status: 'apply-failed',
      mutationPerformed: Boolean(createdApp?.id),
      mutationAttribution: createdApp?.id ? mutationAttribution : 'unproven',
      createCorrelation,
      preCreateAppIds,
      ...(ambiguousCreateFailure ? { ambiguousCreateFailure } : {}),
      rollbackPerformed,
      runtimeBefore,
      blockingApplication: summarizeApp(blockingApp),
      managedApplication: summarizeApp(createdApp, { includeId: true }),
      failure: failureSummary(error),
    });
    throw error;
  }
}

export async function rollbackRunCreatedPublicApexAccess({ env = process.env } = {}) {
  const config = configFromEnv(env);
  requireProviderConfig(config);

  const raw = await readFile(config.evidencePath, 'utf8');
  const evidence = JSON.parse(raw);
  if (evidence?.targetHostname !== config.targetHostname || evidence?.applicationName !== config.applicationName) {
    throw new Error('ROLLBACK_EVIDENCE_SCOPE_MISMATCH');
  }

  const createCorrelation = clean(evidence?.createCorrelation);
  const preCreateAppIds = Array.isArray(evidence?.preCreateAppIds) ? evidence.preCreateAppIds : [];
  const correlationRecoveryEligible = Boolean(createCorrelation)
    && ['create-pending', 'mutation-state-unknown'].includes(evidence?.status);
  if (correlationRecoveryEligible) {
    const recovery = await pollCorrelatedManagedCandidate(config, preCreateAppIds, createCorrelation);
    if (recovery.candidate) {
      await deleteApplication(config, recovery.candidate.id);
      await writeEvidence(config, {
        ...evidence,
        status: 'rolled-back-after-proof-failure',
        mutationPerformed: true,
        mutationState: 'known',
        mutationAttribution: 'correlation-readback',
        rollbackPerformed: true,
        managedApplication: summarizeApp(recovery.candidate, { includeId: true }),
      });
      return { status: 'rolled-back-after-proof-failure' };
    }
    return { status: 'rollback-blocked-mutation-state-unproven' };
  }

  const mutationStateUnproven = evidence?.status === 'mutation-state-unknown'
    || evidence?.status === 'create-pending'
    || evidence?.mutationState === 'unknown'
    || evidence?.mutationState === 'pending'
    || evidence?.mutationAttribution === 'unproven'
    || evidence?.mutationAttribution === 'correlation-pending'
    || (evidence?.mutationPerformed === true && !PROVEN_MUTATION_ATTRIBUTIONS.has(evidence?.mutationAttribution));
  if (mutationStateUnproven) {
    return { status: 'rollback-blocked-mutation-state-unproven' };
  }

  if (evidence?.rollbackPerformed === true) {
    await writeEvidence(config, {
      ...evidence,
      status: 'rollback-not-required',
      rollbackPerformed: true,
    });
    return { status: 'rollback-not-required' };
  }

  if (evidence?.mutationPerformed !== true) {
    if (
      evidence?.mutationPerformed !== false
      || !PROVEN_NO_MUTATION_STATUSES.has(evidence?.status)
      || PROVEN_MUTATION_ATTRIBUTIONS.has(evidence?.mutationAttribution)
      || clean(evidence?.managedApplication?.id)
    ) {
      return { status: 'rollback-blocked-mutation-state-unproven' };
    }
    await writeEvidence(config, {
      ...evidence,
      status: 'rollback-not-required',
      rollbackPerformed: false,
    });
    return { status: 'rollback-not-required' };
  }

  const mutationAttributionIsUnproven = evidence?.mutationAttribution !== 'provider-returned-id'
    && evidence?.mutationAttribution !== 'correlation-readback';
  if (mutationAttributionIsUnproven) {
    throw new Error('ROLLBACK_MUTATION_ATTRIBUTION_UNPROVEN');
  }

  const appId = clean(evidence?.managedApplication?.id);
  if (!appId) throw new Error('ROLLBACK_MANAGED_APP_ID_MISSING');

  const apps = await listApplications(config);
  const candidates = apps.filter((app) => clean(app?.id) === appId);
  if (candidates.length !== 1) throw new Error('ROLLBACK_MANAGED_APP_ID_NOT_UNIQUE');
  const candidate = candidates[0];
  if (clean(candidate?.name) !== config.applicationName) throw new Error('ROLLBACK_MANAGED_APP_NAME_MISMATCH');
  if (!appHasOnlyManagedPublicDestination(candidate, config.targetHostname)) {
    throw new Error('ROLLBACK_MANAGED_APP_DESTINATION_MISMATCH');
  }
  const policies = await listPolicies(config, appId);
  if (!policies.some(isEveryoneBypassPolicy)) throw new Error('ROLLBACK_MANAGED_APP_POLICY_MISMATCH');
  if (evidence?.mutationAttribution === 'correlation-readback') {
    if (!createCorrelation || !policies.some((policy) => isCorrelatedEveryoneBypassPolicy(policy, createCorrelation))) {
      throw new Error('ROLLBACK_MANAGED_APP_CORRELATION_MISMATCH');
    }
  }

  await deleteApplication(config, appId);
  await writeEvidence(config, {
    ...evidence,
    status: 'rolled-back-after-proof-failure',
    rollbackPerformed: true,
  });
  return { status: 'rolled-back-after-proof-failure' };
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const command = process.argv.includes('--rollback-created') ? 'rollback' : 'reconcile';
  const apply = process.argv.includes('--apply');
  const task = command === 'rollback'
    ? rollbackRunCreatedPublicApexAccess()
    : reconcilePublicApexAccess({ apply });

  task
    .then((result) => console.log(`PUBLIC_APEX_ACCESS_RESULT status=${result.status}`))
    .catch((error) => {
      const code = error instanceof Error ? error.message : 'UNKNOWN_FAILURE';
      console.error(`PUBLIC_APEX_ACCESS_FAILED code=${code}`);
      process.exitCode = 1;
    });
}
