import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
export const DEFAULT_EVIDENCE_PATH = 'artifacts/cloudflare-access-coverage.json';
export const DEFAULT_TARGET_HOSTS = Object.freeze([
  'sekretbip.net',
  'app.sekretbip.net',
  'api.sekretbip.net',
]);
export const DEFAULT_BACKEND_WORKER_ID = 'sekret-backend';
export const DEFAULT_TARGET_ZONE = 'sekretbip.net';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenCandidatesFromEnv(env) {
  const candidates = [
    ['CLOUDFLARE_ACCESS_API_TOKEN', clean(env.CLOUDFLARE_ACCESS_API_TOKEN)],
    ['CLOUDFLARE_API_TOKEN', clean(env.CLOUDFLARE_API_TOKEN)],
    ['CLOUDFLARE_WORKERS_BUILDS_API_TOKEN', clean(env.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN)],
  ]
    .filter(([, token]) => token)
    .map(([source, token]) => ({ source, token }));

  return candidates.filter(
    (candidate, index) => candidates.findIndex((other) => other.token === candidate.token) === index,
  );
}

function providerError(payload, fallback = 'Cloudflare request failed') {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return {
    codes: errors
      .map((item) => item?.code)
      .filter((code) => Number.isInteger(code)),
    messages: errors
      .map((item) => clean(item?.message))
      .filter(Boolean)
      .slice(0, 5),
    fallback: clean(fallback) || 'Cloudflare request failed',
  };
}

async function requestJson({ token }, requestPath, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}${requestPath}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const detail = providerError(payload, response.statusText);
    const error = new Error(
      `Cloudflare GET ${requestPath} failed (${response.status}): ${detail.messages.join('; ') || detail.fallback}`,
    );
    error.providerStatus = response.status;
    error.providerCodes = detail.codes;
    throw error;
  }
  return payload;
}

function hostnameFromValue(value) {
  const raw = clean(value);
  if (!raw) return '';
  const withoutWildcard = raw.replace(/^\*\./, 'wildcard.');
  try {
    const url = new URL(withoutWildcard.includes('://') ? withoutWildcard : `https://${withoutWildcard}`);
    const hostname = url.hostname.toLowerCase();
    return hostname === 'wildcard.' ? '*.' : hostname.replace(/^wildcard\./, '*.');
  } catch {
    return raw.toLowerCase().split('/')[0];
  }
}

function hostnameMatches(pattern, target) {
  const normalizedPattern = hostnameFromValue(pattern);
  const normalizedTarget = hostnameFromValue(target);
  if (!normalizedPattern || !normalizedTarget) return false;
  if (normalizedPattern === normalizedTarget) return true;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(1);
    return normalizedTarget.endsWith(suffix) && normalizedTarget !== suffix.slice(1);
  }
  return false;
}

function destinationHost(destination) {
  return hostnameFromValue(destination?.hostname || destination?.uri || '');
}

function applicationReasons(app, target, backendWorkerId) {
  const reasons = [];
  if (hostnameMatches(app?.domain, target)) reasons.push('domain');
  for (const domain of Array.isArray(app?.self_hosted_domains) ? app.self_hosted_domains : []) {
    if (hostnameMatches(domain, target)) reasons.push('self-hosted-domain');
  }

  for (const destination of Array.isArray(app?.destinations) ? app.destinations : []) {
    const type = clean(destination?.type).toLowerCase();
    if (type === 'all_workers') reasons.push('all-workers');
    if (
      type === 'worker'
      && backendWorkerId
      && clean(destination?.worker_id).toLowerCase() === backendWorkerId.toLowerCase()
    ) {
      reasons.push('backend-worker-routing-dependent');
    }
    if (type === 'public' && hostnameMatches(destinationHost(destination), target)) {
      reasons.push('public-destination');
    }
  }
  return unique(reasons);
}

function selectorKinds(rules) {
  if (!Array.isArray(rules)) return [];
  return unique(
    rules.flatMap((rule) => (rule && typeof rule === 'object' ? Object.keys(rule) : [])),
  ).sort();
}

function publicPolicy(policy) {
  return {
    id: clean(policy?.id) || null,
    decision: clean(policy?.decision) || null,
    precedence: Number.isInteger(policy?.precedence) ? policy.precedence : null,
    includeSelectors: selectorKinds(policy?.include),
    requireSelectors: selectorKinds(policy?.require),
    excludeSelectors: selectorKinds(policy?.exclude),
  };
}

function publicApplication(app, reasons, policies, policyReadError = null) {
  return {
    id: clean(app?.id) || null,
    name: clean(app?.name) || null,
    type: clean(app?.type) || null,
    domain: clean(app?.domain) || null,
    destinationTypes: unique(
      (Array.isArray(app?.destinations) ? app.destinations : [])
        .map((destination) => clean(destination?.type).toLowerCase()),
    ),
    reasons,
    policies,
    policyReadError,
  };
}

async function listApplications(config, fetchImpl) {
  const payload = await requestJson(
    config,
    `/accounts/${config.accountId}/access/apps?per_page=1000`,
    fetchImpl,
  );
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function listPolicies(config, appId, fetchImpl) {
  const payload = await requestJson(
    config,
    `/accounts/${config.accountId}/access/apps/${encodeURIComponent(appId)}/policies?per_page=1000`,
    fetchImpl,
  );
  return (Array.isArray(payload?.result) ? payload.result : []).map(publicPolicy);
}

async function getOrganization(config, fetchImpl) {
  const payload = await requestJson(
    config,
    `/accounts/${config.accountId}/access/organizations`,
    fetchImpl,
  );
  return payload?.result && typeof payload.result === 'object' && !Array.isArray(payload.result)
    ? payload.result
    : null;
}

function booleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function publicOrganization(organization, targetZone) {
  const hasExemptedZones = Array.isArray(organization?.deny_unmatched_requests_exempted_zone_names);
  const exemptedZoneNames = hasExemptedZones
    ? organization.deny_unmatched_requests_exempted_zone_names
        .map((zone) => clean(zone).toLowerCase())
        .filter(Boolean)
    : [];
  const normalizedTargetZone = clean(targetZone).toLowerCase();
  return {
    authDomain: clean(organization?.auth_domain) || null,
    denyUnmatchedRequests: booleanOrNull(organization?.deny_unmatched_requests),
    targetZone: normalizedTargetZone || null,
    targetZoneExempted: hasExemptedZones && normalizedTargetZone
      ? exemptedZoneNames.includes(normalizedTargetZone)
      : null,
    exemptedZoneCount: hasExemptedZones ? exemptedZoneNames.length : null,
    isUiReadOnly: booleanOrNull(organization?.is_ui_read_only),
  };
}

async function writeEvidence(evidencePath, receipt) {
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function minimalErrorReceipt(error, source) {
  return {
    source,
    status: Number.isInteger(error?.providerStatus) ? error.providerStatus : null,
    providerCodes: Array.isArray(error?.providerCodes) ? error.providerCodes : [],
  };
}

export function formatAccessAuditLogSummary(receipt) {
  const coverage = Array.isArray(receipt?.coverage) ? receipt.coverage : [];
  const matchedTargetCount = coverage.filter(
    (entry) => Array.isArray(entry?.matchingApplications) && entry.matchingApplications.length > 0,
  ).length;
  const matchingApplicationCount = coverage.reduce(
    (total, entry) => total + (Array.isArray(entry?.matchingApplications) ? entry.matchingApplications.length : 0),
    0,
  );
  const policyReadFailureCount = coverage.reduce(
    (total, entry) => total + (Array.isArray(entry?.matchingApplications)
      ? entry.matchingApplications.filter((application) => Boolean(application?.policyReadError)).length
      : 0),
    0,
  );

  return [
    'CLOUDFLARE_ACCESS_AUDIT',
    `status=${clean(receipt?.status) || 'unknown'}`,
    `targets=${Array.isArray(receipt?.targets) ? receipt.targets.length : 0}`,
    `matchedTargets=${matchedTargetCount}`,
    `matchingApplications=${matchingApplicationCount}`,
    `policyReadFailures=${policyReadFailureCount}`,
    `organizationVisible=${Boolean(receipt?.organization)}`,
    `mutationPerformed=${receipt?.mutationPerformed === true}`,
  ].join(' ');
}

export async function auditCloudflareAccessCoverage({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  evidencePath = clean(env.CLOUDFLARE_ACCESS_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH,
  targetHosts = clean(env.CLOUDFLARE_ACCESS_TARGET_HOSTS)
    ? clean(env.CLOUDFLARE_ACCESS_TARGET_HOSTS).split(',').map((item) => clean(item).toLowerCase()).filter(Boolean)
    : [...DEFAULT_TARGET_HOSTS],
  backendWorkerId = clean(env.CLOUDFLARE_ACCESS_BACKEND_WORKER_ID) || DEFAULT_BACKEND_WORKER_ID,
  targetZone = clean(env.CLOUDFLARE_ACCESS_TARGET_ZONE) || DEFAULT_TARGET_ZONE,
} = {}) {
  const accountId = clean(env.CLOUDFLARE_ACCOUNT_ID);
  const candidates = tokenCandidatesFromEnv(env);
  const baseReceipt = {
    version: 2,
    generatedAt: now().toISOString(),
    mutationPerformed: false,
    accountIdConfigured: Boolean(accountId),
    targets: targetHosts,
    backendWorkerId,
    credential: {
      candidateSources: candidates.map((candidate) => candidate.source),
      selectedSource: null,
      failures: [],
      organizationSelectedSource: null,
      organizationFailures: [],
    },
    coverage: [],
    organization: null,
  };

  if (!accountId || candidates.length === 0) {
    baseReceipt.status = 'configuration-missing';
    baseReceipt.error = !accountId
      ? 'CLOUDFLARE_ACCOUNT_ID is required.'
      : 'At least one Cloudflare API token candidate is required.';
    await writeEvidence(evidencePath, baseReceipt);
    throw new Error(baseReceipt.error);
  }

  let selectedConfig = null;
  let applications = null;
  for (const candidate of candidates) {
    try {
      applications = await listApplications(
        { accountId, token: candidate.token },
        fetchImpl,
      );
      selectedConfig = { accountId, token: candidate.token, source: candidate.source };
      break;
    } catch (error) {
      baseReceipt.credential.failures.push(minimalErrorReceipt(error, candidate.source));
    }
  }

  if (!selectedConfig || !applications) {
    baseReceipt.status = 'provider-read-failed';
    baseReceipt.error = 'No configured Cloudflare token could read Access applications.';
    await writeEvidence(evidencePath, baseReceipt);
    throw new Error(baseReceipt.error);
  }

  baseReceipt.credential.selectedSource = selectedConfig.source;
  baseReceipt.applicationCountObserved = applications.length;

  for (const target of targetHosts) {
    const matchingApplications = [];
    for (const app of applications) {
      const reasons = applicationReasons(app, target, backendWorkerId);
      if (reasons.length === 0) continue;

      let policies = [];
      let policyReadError = null;
      const appId = clean(app?.id);
      if (appId) {
        try {
          policies = await listPolicies(selectedConfig, appId, fetchImpl);
        } catch (error) {
          policyReadError = minimalErrorReceipt(error, selectedConfig.source);
        }
      }
      matchingApplications.push(publicApplication(app, reasons, policies, policyReadError));
    }
    baseReceipt.coverage.push({
      hostname: target,
      matchingApplications,
    });
  }

  let organization = null;
  let organizationSelectedSource = null;
  for (const candidate of candidates) {
    try {
      organization = await getOrganization(
        { accountId, token: candidate.token },
        fetchImpl,
      );
      organizationSelectedSource = candidate.source;
      break;
    } catch (error) {
      baseReceipt.credential.organizationFailures.push(minimalErrorReceipt(error, candidate.source));
    }
  }

  if (!organizationSelectedSource || !organization) {
    baseReceipt.status = 'organization-read-failed';
    baseReceipt.error = 'No configured Cloudflare token could read Access organization settings.';
    await writeEvidence(evidencePath, baseReceipt);
    throw new Error(baseReceipt.error);
  }

  baseReceipt.credential.organizationSelectedSource = organizationSelectedSource;
  baseReceipt.organization = publicOrganization(organization, targetZone);
  baseReceipt.status = 'audited';
  await writeEvidence(evidencePath, baseReceipt);
  return baseReceipt;
}

function printReceipt(receipt) {
  console.log(formatAccessAuditLogSummary(receipt));
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  auditCloudflareAccessCoverage()
    .then(printReceipt)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
