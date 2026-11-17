import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveCloudflareAccessServiceAuth} from './cloudflare-access-service-auth.mjs';

const DEFAULT_FRONTEND_RELEASE_URL = 'https://app.sekretbip.net/.well-known/sekret-release.json';
const DEFAULT_BACKEND_HEALTH_URL = 'https://api.sekretbip.net/health';
const DEFAULT_EVIDENCE_PATH = 'artifacts/production-release-endpoint-probe.json';
const DEFAULT_CLOUDFLARE_EVIDENCE_PATH = 'artifacts/cloudflare-native-deploy.json';

function safeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isCloudflareAccessUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === 'cloudflareaccess.com' || hostname.endsWith('.cloudflareaccess.com');
  } catch {
    return false;
  }
}

export function hasCloudflareAccessHtmlMarker(rawBody) {
  if (typeof rawBody !== 'string' || !rawBody) return false;
  const normalized = rawBody.toLowerCase();
  if (!normalized.includes('cloudflare access')) return false;
  return (
    normalized.includes('<title>sign in') ||
    normalized.includes('/cdn-cgi/access/') ||
    normalized.includes('that account does not have access')
  );
}

// Distinct from Cloudflare Access (Zero Trust SSO login): this is Cloudflare's
// WAF-layer bot/managed-challenge page (Bot Fight Mode, "I'm Under Attack
// Mode", or a custom WAF challenge rule). A service-token Access bypass does
// NOT clear this — it needs a WAF/Bot Fight Mode exception for the route.
// Discovered 2026-10-18 on #696: the verifier polled blind for ~30 minutes
// because this page was indistinguishable from "worker not yet deployed".
export function hasCloudflareChallengeHtmlMarker(rawBody) {
  if (typeof rawBody !== 'string' || !rawBody) return false;
  const normalized = rawBody.toLowerCase();
  return (
    normalized.includes('_cf_chl_opt') ||
    normalized.includes('/cdn-cgi/challenge-platform/') ||
    normalized.includes('checking your browser before accessing') ||
    (normalized.includes('just a moment') && normalized.includes('cloudflare'))
  );
}

export function sanitizeObservedUrl(rawUrl) {
  const value = safeString(rawUrl);
  if (!value) return null;
  try {
    const parsed = new URL(value);
    parsed.search = '';
    parsed.hash = '';
    if (isCloudflareAccessUrl(value)) {
      return `https://cloudflareaccess.com${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function classifyEndpointProbe(evidence) {
  if (evidence?.redirected && isCloudflareAccessUrl(evidence?.finalUrl)) {
    return 'cloudflare-access-intercepted';
  }
  if (evidence?.accessBlockPage === true) return 'cloudflare-access-intercepted';
  if (evidence?.challengeBlockPage === true) return 'cloudflare-challenge-intercepted';
  if (evidence?.jsonState === 'fetch-error') return 'fetch-error';
  if (evidence?.ok !== true) return 'http-error';
  if (evidence?.jsonState !== 'ok') return 'invalid-json';
  return 'ok';
}

export async function probeJsonEndpoint(rawUrl, {fetchImpl = fetch, accessAuth} = {}) {
  const requestedUrl = new URL(rawUrl);
  requestedUrl.searchParams.set('probe', `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const resolvedAccessAuth = accessAuth ?? resolveCloudflareAccessServiceAuth();

  try {
    const response = await fetchImpl(requestedUrl, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        ...resolvedAccessAuth.headers,
      },
      redirect: 'follow',
    });

    const contentType = safeString(response.headers.get('content-type'));
    let json = null;
    let jsonState = response.ok ? 'invalid' : 'skipped-non-ok';
    let accessBlockPage = false;
    let challengeBlockPage = false;

    // Cloudflare's WAF-layer bot/managed challenge is commonly served as a
    // non-2xx HTML response to non-browser clients, so this check must not
    // be gated on response.ok the way the JSON parse below is — an un-ok
    // response is exactly the shape a challenge page takes.
    if (contentType?.toLowerCase().startsWith('text/html') && typeof response.clone === 'function') {
      try {
        const responseBody = await response.clone().text();
        accessBlockPage = hasCloudflareAccessHtmlMarker(responseBody);
        if (!accessBlockPage) challengeBlockPage = hasCloudflareChallengeHtmlMarker(responseBody);
      } catch {
        accessBlockPage = false;
        challengeBlockPage = false;
      }
    }

    if (response.ok && !accessBlockPage && !challengeBlockPage) {
      try {
        json = await response.json();
        jsonState = 'ok';
      } catch {
        jsonState = 'invalid';
      }
    }

    const rawFinalUrl = safeString(response.url);
    const classificationEvidence = {
      finalUrl: rawFinalUrl,
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      jsonState,
      accessBlockPage,
      challengeBlockPage,
    };
    const evidence = {
      requestedUrl: rawUrl,
      finalUrl: sanitizeObservedUrl(rawFinalUrl),
      status: response.status,
      ok: response.ok,
      redirected: response.redirected,
      contentType,
      jsonState,
      accessBlockPage,
      challengeBlockPage,
      accessServiceAuthConfigured: resolvedAccessAuth.configured,
      commitSha: safeString(json?.commitSha),
      releaseSha: safeString(json?.releaseSha),
      healthOk: json?.ok === true,
    };

    return {
      ...evidence,
      classification: classifyEndpointProbe(classificationEvidence),
    };
  } catch (error) {
    return {
      requestedUrl: rawUrl,
      finalUrl: null,
      status: null,
      ok: false,
      redirected: false,
      contentType: null,
      jsonState: 'fetch-error',
      accessBlockPage: false,
      accessServiceAuthConfigured: resolvedAccessAuth.configured,
      commitSha: null,
      releaseSha: null,
      healthOk: false,
      classification: 'fetch-error',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
  }
}

export async function collectProductionReleaseEndpointEvidence({
  frontendReleaseUrl = process.env.FRONTEND_RELEASE_URL ?? DEFAULT_FRONTEND_RELEASE_URL,
  backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? DEFAULT_BACKEND_HEALTH_URL,
  expectedSha = process.env.EXPECTED_RELEASE_SHA ?? process.env.GITHUB_SHA ?? null,
  fetchImpl = fetch,
  accessAuth = resolveCloudflareAccessServiceAuth(),
} = {}) {
  const [frontend, backend] = await Promise.all([
    probeJsonEndpoint(frontendReleaseUrl, {fetchImpl, accessAuth}),
    probeJsonEndpoint(backendHealthUrl, {fetchImpl, accessAuth}),
  ]);

  const blockedByAccess = [
    frontend.classification === 'cloudflare-access-intercepted' ? 'frontend' : null,
    backend.classification === 'cloudflare-access-intercepted' ? 'backend' : null,
  ].filter(Boolean);

  // Symmetric to blockedByAccess: a WAF/bot-challenge block is a distinct
  // failure mode from an Access-login block (see hasCloudflareChallengeHtmlMarker)
  // and must not be silently folded into "observed" or misreported as Access.
  const blockedByChallenge = [
    frontend.classification === 'cloudflare-challenge-intercepted' ? 'frontend' : null,
    backend.classification === 'cloudflare-challenge-intercepted' ? 'backend' : null,
  ].filter(Boolean);

  const status =
    blockedByAccess.length > 0
      ? 'cloudflare-access-intercepted'
      : blockedByChallenge.length > 0
        ? 'cloudflare-challenge-intercepted'
        : 'observed';

  return {
    version: 3,
    observedAt: new Date().toISOString(),
    expectedSha: safeString(expectedSha)?.toLowerCase() ?? null,
    status,
    accessServiceAuthConfigured: accessAuth.configured,
    blockedByAccess,
    blockedByChallenge,
    frontend,
    backend,
  };
}

export function writeProductionReleaseEndpointEvidence(evidence, evidencePath = DEFAULT_EVIDENCE_PATH) {
  fs.mkdirSync(path.dirname(evidencePath), {recursive: true});
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return evidencePath;
}

export function buildCloudflareAccessBlockerEvidence(evidence) {
  const expectedSha = safeString(evidence?.expectedSha)?.toLowerCase() ?? null;
  const readinessState =
    evidence?.status === 'cloudflare-challenge-intercepted'
      ? 'cloudflare-challenge-intercepted'
      : 'cloudflare-access-intercepted';
  return {
    version: 5,
    commitSha: expectedSha,
    expectedSha,
    status: 'failed',
    complete: false,
    readinessState,
    observerError: null,
    transportBlocker: {
      status: readinessState,
      accessServiceAuthConfigured: evidence?.accessServiceAuthConfigured === true,
      blockedSurfaces: Array.isArray(evidence?.blockedByAccess) ? [...evidence.blockedByAccess] : [],
      blockedByChallenge: Array.isArray(evidence?.blockedByChallenge) ? [...evidence.blockedByChallenge] : [],
      frontendClassification: safeString(evidence?.frontend?.classification),
      backendClassification: safeString(evidence?.backend?.classification),
    },
    checkSummary: {missing: [], pending: [], failed: [], unsuccessful: []},
    requiredChecks: {},
    pagesRelease: {commitSha: null, expectedSha, complete: false},
    workerRuntime: {
      expectedSha,
      releaseSha: null,
      versionId: null,
      versionTag: null,
      healthOk: false,
      complete: false,
    },
  };
}

export function writeCloudflareAccessBlockerEvidence(
  evidence,
  evidencePath = process.env.CLOUDFLARE_EVIDENCE_PATH ?? DEFAULT_CLOUDFLARE_EVIDENCE_PATH,
) {
  const blocker = buildCloudflareAccessBlockerEvidence(evidence);
  fs.mkdirSync(path.dirname(evidencePath), {recursive: true});
  fs.writeFileSync(evidencePath, `${JSON.stringify(blocker, null, 2)}\n`, 'utf8');
  return evidencePath;
}

async function main() {
  const evidence = await collectProductionReleaseEndpointEvidence();
  const evidencePath = process.env.RELEASE_ENDPOINT_PROBE_PATH ?? DEFAULT_EVIDENCE_PATH;
  writeProductionReleaseEndpointEvidence(evidence, evidencePath);
  console.log(JSON.stringify(evidence, null, 2));

  if (evidence.status === 'cloudflare-access-intercepted') {
    writeCloudflareAccessBlockerEvidence(evidence);
    throw new Error(`CLOUDFLARE_ACCESS_INTERCEPTED surfaces=${evidence.blockedByAccess.join(',')}`);
  }

  if (evidence.status === 'cloudflare-challenge-intercepted') {
    writeCloudflareAccessBlockerEvidence(evidence);
    throw new Error(`CLOUDFLARE_CHALLENGE_INTERCEPTED surfaces=${evidence.blockedByChallenge.join(',')}`);
  }
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
