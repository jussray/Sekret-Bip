import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  routePatternMayMatchHost,
  routePatternTargetsExactHost,
} from './reconcile-cloudflare-app-domain.mjs';

const API_BASE = 'https://api.cloudflare.com/client/v4';
export const DEFAULT_EVIDENCE_PATH = 'artifacts/cloudflare-app-binding-authority.json';
export const DEFAULT_ZONE = 'sekretbip.net';
export const DEFAULT_HOSTNAME = 'app.sekretbip.net';
export const DEFAULT_PAGES_PROJECT = 'sekret-bip';
export const DEFAULT_APP_URL = 'https://app.sekretbip.net';
export const DEFAULT_API_HEALTH_URL = 'https://api.sekretbip.net/health';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function providerCodes(payload) {
  return (Array.isArray(payload?.errors) ? payload.errors : [])
    .map((item) => item?.code)
    .filter((code) => Number.isInteger(code));
}

async function requestJson(token, requestPath, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}${requestPath}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const error = new Error(`Cloudflare read failed at ${requestPath}.`);
    error.providerStatus = response.status;
    error.providerCodes = providerCodes(payload);
    throw error;
  }
  return payload?.result;
}

function minimalFailure(error, stage) {
  return {
    stage,
    status: Number.isInteger(error?.providerStatus) ? error.providerStatus : null,
    providerCodes: Array.isArray(error?.providerCodes) ? error.providerCodes : [],
  };
}

function isCloudflareAccessUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'cloudflareaccess.com'
      || hostname.endsWith('.cloudflareaccess.com')
      || url.pathname.toLowerCase().startsWith('/cdn-cgi/access/')
    );
  } catch {
    return false;
  }
}

export function classifyRuntimeProbe({ status, contentType = '', finalUrl = '', body = '' } = {}) {
  const normalizedBody = String(body).toLowerCase();
  if (
    isCloudflareAccessUrl(finalUrl)
    || (normalizedBody.includes('cloudflare access')
      && (normalizedBody.includes('login') || normalizedBody.includes('sign in')))
  ) {
    return 'cloudflare-access';
  }
  if (status === 405 || normalizedBody.includes('"error":"method not allowed"')) {
    return 'method-not-allowed';
  }
  if (status >= 200 && status < 400 && String(contentType).toLowerCase().includes('text/html')) {
    return 'frontend-html';
  }
  if (String(contentType).toLowerCase().includes('application/json')) return 'json';
  return 'other';
}

async function probeRuntime(url, fetchImpl) {
  const response = await fetchImpl(url, { method: 'GET', redirect: 'follow' });
  const body = await response.text().catch(() => '');
  let finalHostname = null;
  try {
    finalHostname = new URL(response.url || url).hostname.toLowerCase();
  } catch {
    finalHostname = null;
  }
  return {
    status: response.status,
    contentType: response.headers?.get?.('content-type') || '',
    finalHostname,
    redirected: response.redirected === true,
    classification: classifyRuntimeProbe({
      status: response.status,
      contentType: response.headers?.get?.('content-type') || '',
      finalUrl: response.url || url,
      body,
    }),
  };
}

async function probeBackend(url, fetchImpl) {
  const response = await fetchImpl(url, { method: 'GET', redirect: 'follow' });
  const text = await response.text().catch(() => '');
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  return {
    status: response.status,
    ok: payload?.ok === true,
    worker: clean(payload?.worker) || null,
  };
}

function summarizePagesDomain(domain) {
  return {
    id: clean(domain?.id || domain?.domain_id) || null,
    name: clean(domain?.name) || null,
    status: clean(domain?.status) || null,
  };
}

function summarizeWorkerDomain(domain) {
  return {
    id: clean(domain?.id) || null,
    hostname: clean(domain?.hostname).toLowerCase() || null,
    service: clean(domain?.service) || null,
  };
}

function summarizeRoute(route) {
  return {
    id: clean(route?.id) || null,
    pattern: clean(route?.pattern) || null,
    script: clean(route?.script) || null,
  };
}

async function writeEvidence(evidencePath, receipt) {
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function auditCloudflareAppBindingAuthority({
  env = process.env,
  fetchImpl = fetch,
  now = () => new Date(),
  evidencePath = clean(env.CLOUDFLARE_APP_BINDING_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH,
  zoneName = clean(env.CLOUDFLARE_ACCESS_TARGET_ZONE) || DEFAULT_ZONE,
  hostname = clean(env.CLOUDFLARE_APP_HOSTNAME) || DEFAULT_HOSTNAME,
  pagesProject = clean(env.CLOUDFLARE_PAGES_PROJECT) || DEFAULT_PAGES_PROJECT,
  appUrl = clean(env.CLOUDFLARE_APP_URL) || DEFAULT_APP_URL,
  apiHealthUrl = clean(env.CLOUDFLARE_API_HEALTH_URL) || DEFAULT_API_HEALTH_URL,
} = {}) {
  const token = clean(env.CLOUDFLARE_API_TOKEN);
  const accountId = clean(env.CLOUDFLARE_ACCOUNT_ID);
  const zoneId = clean(env.CLOUDFLARE_ZONE_ID);
  const receipt = {
    version: 1,
    generatedAt: now().toISOString(),
    mutationPerformed: false,
    automaticMutationAuthorized: false,
    target: {
      zone: zoneName,
      hostname,
      pagesProject,
    },
    credential: {
      source: token ? 'CLOUDFLARE_API_TOKEN' : null,
      accountConfigured: Boolean(accountId),
      zoneConfigured: Boolean(zoneId),
    },
    providerIdentityVerified: false,
    pagesDomain: null,
    exactWorkerDomains: [],
    exactWorkerRoutes: [],
    broadWorkerRoutes: [],
    runtime: null,
    backend: null,
    failure: null,
  };

  if (!token || !accountId || !zoneId) {
    receipt.status = 'configuration-missing';
    receipt.failure = {
      stage: 'configuration',
      status: null,
      providerCodes: [],
    };
    await writeEvidence(evidencePath, receipt);
    throw new Error('Cloudflare app binding audit requires API token, account ID, and zone ID.');
  }

  try {
    const zone = await requestJson(token, `/zones/${zoneId}`, fetchImpl);
    if (clean(zone?.name).toLowerCase() !== zoneName.toLowerCase()) {
      throw new Error('ZONE_IDENTITY_MISMATCH');
    }
    if (clean(zone?.account?.id) !== accountId) {
      throw new Error('ZONE_ACCOUNT_ID_MISMATCH');
    }
    receipt.providerIdentityVerified = true;

    const pagesDomains = await requestJson(
      token,
      `/accounts/${accountId}/pages/projects/${encodeURIComponent(pagesProject)}/domains`,
      fetchImpl,
    );
    const matchingPagesDomains = (Array.isArray(pagesDomains) ? pagesDomains : [])
      .filter((domain) => clean(domain?.name).toLowerCase() === hostname.toLowerCase());
    if (matchingPagesDomains.length === 1) {
      receipt.pagesDomain = summarizePagesDomain(matchingPagesDomains[0]);
    } else if (matchingPagesDomains.length > 1) {
      throw new Error('MULTIPLE_PAGES_DOMAIN_MATCHES');
    }

    const workerDomains = await requestJson(
      token,
      `/accounts/${accountId}/workers/domains?hostname=${encodeURIComponent(hostname)}`,
      fetchImpl,
    );
    receipt.exactWorkerDomains = (Array.isArray(workerDomains) ? workerDomains : [])
      .filter((domain) => clean(domain?.hostname).toLowerCase() === hostname.toLowerCase())
      .map(summarizeWorkerDomain);

    const workerRoutes = await requestJson(token, `/zones/${zoneId}/workers/routes`, fetchImpl);
    const routes = Array.isArray(workerRoutes) ? workerRoutes : [];
    receipt.exactWorkerRoutes = routes
      .filter((route) => routePatternTargetsExactHost(route?.pattern, hostname))
      .map(summarizeRoute);
    receipt.broadWorkerRoutes = routes
      .filter((route) => (
        !routePatternTargetsExactHost(route?.pattern, hostname)
        && routePatternMayMatchHost(route?.pattern, hostname)
      ))
      .map(summarizeRoute);

    receipt.runtime = await probeRuntime(appUrl, fetchImpl);
    receipt.backend = await probeBackend(apiHealthUrl, fetchImpl);
    receipt.status = 'audited';
    await writeEvidence(evidencePath, receipt);
    console.log(
      `CLOUDFLARE_APP_BINDING_AUDIT_COMPLETE pages=${receipt.pagesDomain?.status || 'missing'} worker_domains=${receipt.exactWorkerDomains.length} exact_routes=${receipt.exactWorkerRoutes.length} broad_routes=${receipt.broadWorkerRoutes.length} runtime=${receipt.runtime.classification}`,
    );
    return receipt;
  } catch (error) {
    if (!receipt.failure) {
      receipt.failure = error?.providerStatus !== undefined
        ? minimalFailure(error, 'provider-read')
        : { stage: 'contract', status: null, providerCodes: [] };
    }
    receipt.status = 'audit-failed';
    await writeEvidence(evidencePath, receipt);
    throw error;
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  auditCloudflareAppBindingAuthority().catch(() => {
    console.error('CLOUDFLARE_APP_BINDING_AUDIT_FAILED');
    process.exitCode = 1;
  });
}
