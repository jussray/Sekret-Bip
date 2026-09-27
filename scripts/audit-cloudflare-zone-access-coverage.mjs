import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
export const DEFAULT_EVIDENCE_PATH = 'artifacts/cloudflare-zone-access-coverage.json';
export const DEFAULT_TARGET_ZONE = 'sekretbip.net';
export const DEFAULT_TARGET_HOSTS = Object.freeze([
  'app.sekretbip.net',
  'api.sekretbip.net',
]);
export const DEFAULT_BACKEND_WORKER_ID = 'sekret-backend';

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

function providerError(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return {
    codes: errors
      .map((item) => item?.code)
      .filter((code) => Number.isInteger(code)),
  };
}

async function requestJson(token, requestPath, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}${requestPath}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const detail = providerError(payload);
    const error = new Error(`Cloudflare GET ${requestPath} failed (${response.status}).`);
    error.providerStatus = response.status;
    error.providerCodes = detail.codes;
    throw error;
  }
  return payload;
}

function minimalErrorReceipt(error, source, stage) {
  return {
    source,
    stage,
    status: Number.isInteger(error?.providerStatus) ? error.providerStatus : null,
    providerCodes: Array.isArray(error?.providerCodes) ? error.providerCodes : [],
  };
}

async function resolveZone({ token, accountId, targetZone }, fetchImpl) {
  const payload = await requestJson(
    token,
    `/zones?name=${encodeURIComponent(targetZone)}&status=active&per_page=50`,
    fetchImpl,
  );
  const matches = (Array.isArray(payload?.result) ? payload.result : [])
    .filter((zone) => clean(zone?.name).toLowerCase() === targetZone.toLowerCase());

  if (matches.length !== 1) {
    throw new Error(`ZONE_SELECTION_FAILED: expected one active ${targetZone} zone, found ${matches.length}.`);
  }

  const zone = matches[0];
  const zoneId = clean(zone?.id);
  const resolvedAccountId = clean(zone?.account?.id);
  if (!zoneId) throw new Error('ZONE_ID_MISSING.');
  if (!resolvedAccountId) throw new Error('ZONE_ACCOUNT_ID_MISSING.');
  if (resolvedAccountId !== accountId) throw new Error('ZONE_ACCOUNT_ID_MISMATCH.');
  return zoneId;
}

async function listZoneApplications(token, zoneId, fetchImpl) {
  const payload = await requestJson(
    token,
    `/zones/${zoneId}/access/apps?per_page=1000`,
    fetchImpl,
  );
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function listZonePolicies(token, zoneId, appId, fetchImpl) {
  const payload = await requestJson(
    token,
    `/zones/${zoneId}/access/apps/${encodeURIComponent(appId)}/policies?per_page=1000`,
    fetchImpl,
  );
  return Array.isArray(payload?.result) ? payload.result : [];
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
      reasons.push('backend-worker');
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

async function writeEvidence(evidencePath, receipt) {
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function auditCloudflareZoneAccessCoverage({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  evidencePath = clean(env.CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH,
  targetZone = clean(env.CLOUDFLARE_ACCESS_TARGET_ZONE) || DEFAULT_TARGET_ZONE,
  targetHosts = clean(env.CLOUDFLARE_ACCESS_TARGET_HOSTS)
    ? clean(env.CLOUDFLARE_ACCESS_TARGET_HOSTS).split(',').map((item) => clean(item).toLowerCase()).filter(Boolean)
    : [...DEFAULT_TARGET_HOSTS],
  backendWorkerId = clean(env.CLOUDFLARE_ACCESS_BACKEND_WORKER_ID) || DEFAULT_BACKEND_WORKER_ID,
} = {}) {
  const accountId = clean(env.CLOUDFLARE_ACCOUNT_ID);
  const configuredZoneId = clean(env.CLOUDFLARE_ZONE_ID);
  const candidates = tokenCandidatesFromEnv(env);
  const receipt = {
    version: 2,
    generatedAt: now().toISOString(),
    mutationPerformed: false,
    accountIdConfigured: Boolean(accountId),
    zoneIdConfigured: Boolean(configuredZoneId),
    zoneIdSource: null,
    zoneIdentityVerified: null,
    targetZone,
    targets: targetHosts,
    backendWorkerId,
    credential: {
      candidateSources: candidates.map((candidate) => candidate.source),
      selectedSource: null,
      failures: [],
    },
    applicationCountObserved: null,
    coverage: [],
  };

  if (!accountId || candidates.length === 0) {
    receipt.status = 'configuration-missing';
    receipt.error = !accountId
      ? 'CLOUDFLARE_ACCOUNT_ID is required.'
      : 'At least one Cloudflare API token candidate is required.';
    await writeEvidence(evidencePath, receipt);
    throw new Error(receipt.error);
  }

  let providerConfig = null;
  let zoneId = null;
  let applications = null;

  for (const candidate of candidates) {
    let candidateZoneId = configuredZoneId;
    let zoneIdSource = configuredZoneId ? 'configured-secret' : null;
    let zoneIdentityVerified = null;

    if (!candidateZoneId) {
      try {
        candidateZoneId = await resolveZone(
          { token: candidate.token, accountId, targetZone },
          fetchImpl,
        );
        zoneIdSource = 'provider-discovery';
        zoneIdentityVerified = true;
      } catch (error) {
        receipt.credential.failures.push(minimalErrorReceipt(error, candidate.source, 'zone-discovery'));
        continue;
      }
    }

    try {
      const observedApplications = await listZoneApplications(
        candidate.token,
        candidateZoneId,
        fetchImpl,
      );
      providerConfig = candidate;
      zoneId = candidateZoneId;
      applications = observedApplications;
      receipt.zoneIdSource = zoneIdSource;
      receipt.zoneIdentityVerified = zoneIdentityVerified;
      break;
    } catch (error) {
      receipt.credential.failures.push(minimalErrorReceipt(error, candidate.source, 'zone-access-apps'));
    }
  }

  if (!providerConfig || !zoneId || !applications) {
    receipt.status = 'zone-access-read-failed';
    receipt.error = configuredZoneId
      ? 'No configured Cloudflare token could list Access applications for the configured Se’kret zone ID.'
      : 'No configured Cloudflare token could resolve the target zone and list its Access applications.';
    await writeEvidence(evidencePath, receipt);
    throw new Error(receipt.error);
  }

  receipt.credential.selectedSource = providerConfig.source;
  receipt.applicationCountObserved = applications.length;

  for (const target of targetHosts) {
    const matchingApplications = [];
    for (const app of applications) {
      const reasons = applicationReasons(app, target, backendWorkerId);
      if (reasons.length === 0) continue;

      const appId = clean(app?.id);
      let policies = [];
      let policyReadError = null;
      if (appId) {
        try {
          const observedPolicies = await listZonePolicies(
            providerConfig.token,
            zoneId,
            appId,
            fetchImpl,
          );
          policies = observedPolicies.map(publicPolicy);
        } catch (error) {
          policyReadError = minimalErrorReceipt(error, providerConfig.source, 'zone-access-policies');
        }
      }
      matchingApplications.push(publicApplication(app, reasons, policies, policyReadError));
    }
    receipt.coverage.push({ hostname: target, matchingApplications });
  }

  receipt.status = 'audited';
  await writeEvidence(evidencePath, receipt);
  console.log(
    `CLOUDFLARE_ZONE_ACCESS_AUDIT_COMPLETE zone=${targetZone} zoneIdSource=${receipt.zoneIdSource} apps=${applications.length} matched=${receipt.coverage.reduce((sum, item) => sum + item.matchingApplications.length, 0)} credential=${providerConfig.source}`,
  );
  return receipt;
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  auditCloudflareZoneAccessCoverage().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
