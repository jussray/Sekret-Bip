import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const EVIDENCE_PATH = 'artifacts/cloudflare-app-domain-routing-evidence.json';

export function configFromEnv(env = process.env) {
  return {
    token: env.CLOUDFLARE_API_TOKEN || '',
    zoneName: env.BIP_APP_ZONE || 'sekretbip.net',
    hostname: env.BIP_APP_HOSTNAME || 'app.sekretbip.net',
    workerName: env.BIP_APP_BACKEND_WORKER || 'sekret-backend',
    pagesProject: env.BIP_APP_PAGES_PROJECT || 'sekret-bip',
    accountId: env.CLOUDFLARE_ACCOUNT_ID || '',
    zoneId: env.CLOUDFLARE_ZONE_ID || '',
    appUrl: env.BIP_APP_URL || 'https://app.sekretbip.net',
    apiHealthUrl: env.BIP_API_HEALTH_URL || 'https://api.sekretbip.net/health',
  };
}

function errorText(payload, fallback) {
  const messages = payload?.errors
    ?.map((error) => {
      const code = error?.code === undefined ? '' : `code=${error.code} `;
      return `${code}${error?.message || ''}`.trim();
    })
    .filter(Boolean);
  return messages?.length ? messages.join('; ') : fallback;
}

async function cfRequest(config, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `Cloudflare ${options.method || 'GET'} ${path} failed: ${errorText(payload, response.statusText)}`,
    );
  }

  return payload;
}

export function validateResolvedZone(config, zone) {
  if (!zone?.id || zone.name !== config.zoneName) {
    throw new Error('ZONE_IDENTITY_MISMATCH');
  }

  const resolvedAccountId = zone.account?.id;
  if (!resolvedAccountId) {
    throw new Error('ZONE_ACCOUNT_ID_NOT_FOUND');
  }

  if (config.zoneId && config.zoneId !== zone.id) {
    throw new Error('ZONE_ID_MISMATCH');
  }

  if (config.accountId && config.accountId !== resolvedAccountId) {
    throw new Error('ACCOUNT_ID_MISMATCH');
  }

  return {
    ...config,
    zoneId: zone.id,
    accountId: resolvedAccountId,
  };
}

async function discoverZone(config) {
  if (config.zoneId) {
    const payload = await cfRequest(config, `/zones/${config.zoneId}`);
    return validateResolvedZone(config, payload?.result);
  }

  const payload = await cfRequest(
    config,
    `/zones?name=${encodeURIComponent(config.zoneName)}&status=active&per_page=50`,
  );
  const zone = payload?.result?.find((candidate) => candidate?.name === config.zoneName);
  if (!zone?.id) {
    throw new Error(`ZONE_NOT_FOUND: active Cloudflare zone ${config.zoneName} was not found.`);
  }

  return validateResolvedZone(config, zone);
}

function normalizePattern(pattern) {
  return String(pattern || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '');
}

export function routePatternTargetsExactHost(pattern, hostname) {
  const target = String(hostname || '').trim().toLowerCase();
  const normalized = normalizePattern(pattern);
  return (
    normalized === target ||
    normalized === `${target}/` ||
    normalized === `${target}/*`
  );
}

export function routePatternMayMatchHost(pattern, hostname) {
  const target = String(hostname || '').trim().toLowerCase();
  const normalized = normalizePattern(pattern);
  if (!normalized || !target) return false;

  const escaped = normalized
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const matcher = new RegExp(`^${escaped}$`);
  return matcher.test(target) || matcher.test(`${target}/`) || matcher.test(`${target}/probe`);
}

export function classifyWorkerBindings(
  { routes = [], domains = [] },
  config = configFromEnv({}),
) {
  const hostname = config.hostname.toLowerCase();
  const workerName = config.workerName;

  const matchingDomains = domains.filter(
    (domain) => String(domain?.hostname || '').toLowerCase() === hostname,
  );
  const ownedDomains = matchingDomains.filter((domain) => domain?.service === workerName);
  const foreignDomains = matchingDomains.filter(
    (domain) => domain?.service && domain.service !== workerName,
  );

  const exactRoutes = routes.filter((route) =>
    routePatternTargetsExactHost(route?.pattern, hostname),
  );
  const ownedExactRoutes = exactRoutes.filter((route) => route?.script === workerName);
  const foreignExactRoutes = exactRoutes.filter(
    (route) => route?.script && route.script !== workerName,
  );
  const broadRoutes = routes.filter(
    (route) =>
      !routePatternTargetsExactHost(route?.pattern, hostname) &&
      routePatternMayMatchHost(route?.pattern, hostname),
  );

  return {
    ownedDomains,
    foreignDomains,
    ownedExactRoutes,
    foreignExactRoutes,
    broadRoutes,
  };
}

async function listPagesDomains(config) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/pages/projects/${encodeURIComponent(config.pagesProject)}/domains`,
  );
  return payload?.result || [];
}

async function listWorkerDomains(config) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/workers/domains?hostname=${encodeURIComponent(config.hostname)}`,
  );
  return payload?.result || [];
}

async function listWorkerRoutes(config) {
  const payload = await cfRequest(config, `/zones/${config.zoneId}/workers/routes`);
  return payload?.result || [];
}

export function isCloudflareAccessUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'cloudflareaccess.com' ||
      hostname.endsWith('.cloudflareaccess.com') ||
      url.pathname.toLowerCase().startsWith('/cdn-cgi/access/')
    );
  } catch {
    return false;
  }
}

function probeLooksLikeCloudflareAccess(probe) {
  const finalUrl = probe?.finalUrl || probe?.url || '';
  if (isCloudflareAccessUrl(finalUrl)) return true;

  const body = String(probe?.bodyFingerprint || '').toLowerCase();
  return body.includes('cloudflare access') && (body.includes('login') || body.includes('sign in'));
}

async function runtimeProbe(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();
  return {
    url,
    requestedUrl: url,
    finalUrl: response.url || url,
    redirected: response.redirected === true,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    bodyFingerprint: body.replace(/[\r\n]+/g, '').slice(0, 240),
  };
}

export function backendHealthIdentityMatches(payload, expectedWorker = 'sekret-backend') {
  return payload?.ok === true && payload?.worker === expectedWorker;
}

async function verifyBackend(config) {
  const response = await fetch(config.apiHealthUrl, { redirect: 'follow' });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }

  if (
    response.status < 200 ||
    response.status >= 300 ||
    !backendHealthIdentityMatches(payload, config.workerName)
  ) {
    throw new Error('BACKEND_HEALTH_CONTRACT_FAILED');
  }

  return {
    url: config.apiHealthUrl,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    ok: true,
    worker: config.workerName,
  };
}

function assertPagesOwnership(pagesDomains, config) {
  const pagesDomain = pagesDomains.find(
    (domain) => String(domain?.name || '').toLowerCase() === config.hostname.toLowerCase(),
  );

  if (!pagesDomain) {
    throw new Error(
      `PAGES_DOMAIN_NOT_ATTACHED: ${config.hostname} is not attached to Pages project ${config.pagesProject}. Refusing to detach Worker routing first.`,
    );
  }

  if (pagesDomain.status !== 'active') {
    throw new Error(
      `PAGES_DOMAIN_NOT_ACTIVE: ${config.hostname} status=${pagesDomain.status || 'unknown'} on ${config.pagesProject}.`,
    );
  }

  return pagesDomain;
}

function assertSafeBindings(classification, config) {
  if (classification.foreignDomains.length || classification.foreignExactRoutes.length) {
    throw new Error(
      `FOREIGN_APP_DOMAIN_BINDING: ${config.hostname} is attached to a Worker other than ${config.workerName}. Refusing mutation.`,
    );
  }

  if (classification.broadRoutes.length) {
    const patterns = classification.broadRoutes
      .map((route) => route?.pattern)
      .filter(Boolean);
    throw new Error(
      `BROAD_WORKER_ROUTE_REQUIRES_MANUAL_REVIEW: ${patterns.join(', ')}`,
    );
  }
}

export function appProbeIsFrontend(probe) {
  if (!probe || probe.status < 200 || probe.status >= 400) return false;
  if (probeLooksLikeCloudflareAccess(probe)) return false;
  if (probe.contentType.toLowerCase().startsWith('application/json')) return false;
  return !probe.bodyFingerprint.includes('"error":"Method not allowed"');
}

async function waitForFrontend(config, attempts = 24, delayMs = 5000) {
  let lastProbe = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastProbe = await runtimeProbe(config.appUrl);
    console.log(
      `APP_DOMAIN_PROBE attempt=${attempt} status=${lastProbe.status} content_type=${lastProbe.contentType || 'unknown'} access_intercepted=${probeLooksLikeCloudflareAccess(lastProbe)}`,
    );
    if (appProbeIsFrontend(lastProbe)) return lastProbe;
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('APP_DOMAIN_FRONTEND_NOT_READY');
}

async function writeEvidence(payload) {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    EVIDENCE_PATH,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ...payload,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`EVIDENCE_WRITTEN path=${EVIDENCE_PATH}`);
}

function summarizeBindings(classification) {
  const summarizeDomain = (domain) => ({
    id: domain?.id || null,
    hostname: domain?.hostname || null,
    service: domain?.service || null,
    zone_id: domain?.zone_id || null,
  });
  const summarizeRoute = (route) => ({
    id: route?.id || null,
    pattern: route?.pattern || null,
    script: route?.script || null,
  });

  return {
    ownedDomains: classification.ownedDomains.map(summarizeDomain),
    foreignDomains: classification.foreignDomains.map(summarizeDomain),
    ownedExactRoutes: classification.ownedExactRoutes.map(summarizeRoute),
    foreignExactRoutes: classification.foreignExactRoutes.map(summarizeRoute),
    broadRoutes: classification.broadRoutes.map(summarizeRoute),
  };
}

function evidenceContext({ resolved, pagesDomain, preClassification, runtimeBefore, backendBefore }) {
  return {
    zone: resolved.zoneName,
    zoneId: resolved.zoneId,
    accountId: resolved.accountId,
    hostname: resolved.hostname,
    pagesProject: resolved.pagesProject,
    backendWorker: resolved.workerName,
    pagesDomain: {
      name: pagesDomain.name || resolved.hostname,
      status: pagesDomain.status || null,
      id: pagesDomain.id || pagesDomain.domain_id || null,
    },
    bindingsBefore: summarizeBindings(preClassification),
    runtimeBefore,
    backendBefore,
  };
}

async function persistMutationProgress(context, actions, phase = 'apply-in-progress') {
  await writeEvidence({
    phase,
    ...context,
    actions: [...actions],
  });
}

export async function reconcileCloudflareAppDomain(config = configFromEnv()) {
  if (!config.token) {
    throw new Error(
      'CLOUDFLARE_API_TOKEN_MISSING: requires Workers Scripts Read/Write, Workers Routes Read/Write, Pages Read, and Zone Read.',
    );
  }

  const resolved = await discoverZone(config);
  const [pagesDomains, workerDomains, workerRoutes] = await Promise.all([
    listPagesDomains(resolved),
    listWorkerDomains(resolved),
    listWorkerRoutes(resolved),
  ]);

  const pagesDomain = assertPagesOwnership(pagesDomains, resolved);
  const preClassification = classifyWorkerBindings(
    { routes: workerRoutes, domains: workerDomains },
    resolved,
  );
  assertSafeBindings(preClassification, resolved);

  const runtimeBefore = await runtimeProbe(resolved.appUrl);
  const backendBefore = await verifyBackend(resolved);
  const context = evidenceContext({
    resolved,
    pagesDomain,
    preClassification,
    runtimeBefore,
    backendBefore,
  });

  await writeEvidence({
    phase: 'pre-apply',
    ...context,
    actions: [],
  });

  const actions = [];

  try {
    for (const domain of preClassification.ownedDomains) {
      if (!domain?.id) {
        throw new Error(`WORKER_DOMAIN_ID_MISSING: ${resolved.hostname}`);
      }
      await cfRequest(
        resolved,
        `/accounts/${resolved.accountId}/workers/domains/${domain.id}`,
        { method: 'DELETE' },
      );
      actions.push({ type: 'detach-worker-domain', id: domain.id });
      await persistMutationProgress(context, actions);
      console.log(`WORKER_DOMAIN_DETACHED hostname=${resolved.hostname} id=${domain.id}`);
    }

    for (const route of preClassification.ownedExactRoutes) {
      if (!route?.id) {
        throw new Error(`WORKER_ROUTE_ID_MISSING: ${route?.pattern || resolved.hostname}`);
      }
      await cfRequest(
        resolved,
        `/zones/${resolved.zoneId}/workers/routes/${route.id}`,
        { method: 'DELETE' },
      );
      actions.push({ type: 'delete-worker-route', id: route.id, pattern: route.pattern || null });
      await persistMutationProgress(context, actions);
      console.log(`WORKER_ROUTE_DELETED pattern=${route.pattern || 'unknown'} id=${route.id}`);
    }

    if (actions.length === 0 && !appProbeIsFrontend(runtimeBefore)) {
      throw new Error(
        `APP_DOMAIN_INTERCEPT_UNEXPLAINED: ${resolved.hostname} is still not serving frontend content, but no exact ${resolved.workerName} Worker binding was found.`,
      );
    }

    const [postWorkerDomains, postWorkerRoutes] = await Promise.all([
      listWorkerDomains(resolved),
      listWorkerRoutes(resolved),
    ]);
    const postClassification = classifyWorkerBindings(
      { routes: postWorkerRoutes, domains: postWorkerDomains },
      resolved,
    );
    assertSafeBindings(postClassification, resolved);

    if (postClassification.ownedDomains.length || postClassification.ownedExactRoutes.length) {
      throw new Error(`APP_DOMAIN_WORKER_BINDING_REMAINS: ${resolved.hostname}`);
    }

    const runtimeAfter = await waitForFrontend(resolved);
    const backendAfter = await verifyBackend(resolved);

    await writeEvidence({
      phase: 'post-apply',
      ...context,
      bindingsAfter: summarizeBindings(postClassification),
      runtimeAfter,
      backendAfter,
      actions: [...actions],
    });

    console.log(
      `APP_DOMAIN_ROUTING_RECONCILED hostname=${resolved.hostname} pages=${resolved.pagesProject} worker=${resolved.workerName} actions=${actions.length}`,
    );

    return { actions, runtimeAfter, backendAfter };
  } catch (error) {
    if (actions.length > 0) {
      try {
        await persistMutationProgress(context, actions, 'apply-failed');
      } catch {
        // The always-upload workflow step will retain the latest successfully persisted receipt.
      }
    }
    throw error;
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const config = configFromEnv(env);
  const apply = argv.includes('--apply');

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'plan',
        zone: config.zoneName,
        hostname: config.hostname,
        pagesProject: config.pagesProject,
        backendWorker: config.workerName,
        appUrl: config.appUrl,
        apiHealthUrl: config.apiHealthUrl,
        deleteScope: 'exact-host Worker domain/route only',
        wildcardPolicy: 'fail-closed for every broad route regardless of owner',
        pagesPrecondition: 'target domain must already be active on canonical Pages project',
        applyAuthority: 'workflow_dispatch with apply=true only',
        evidenceArtifact: EVIDENCE_PATH,
      },
      null,
      2,
    ),
  );

  if (!apply) return;
  await reconcileCloudflareAppDomain(config);
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch(() => {
    console.error('CLOUDFLARE_APP_DOMAIN_RECONCILIATION_FAILED');
    process.exitCode = 1;
  });
}