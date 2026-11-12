import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveCloudflareAccessServiceAuth} from './cloudflare-access-service-auth.mjs';
import {
  hasCloudflareAccessHtmlMarker,
  hasCloudflareChallengeHtmlMarker,
} from './probe-production-release-endpoints.mjs';

// Default number of consecutive polls carrying the SAME transport-block
// classification (Cloudflare Access login vs. WAF/bot-challenge) before
// failing fast. A single blip isn't enough — momentary challenge responses
// happen during a live cutover — but this incident (#696, 2026-10-18) showed
// the opposite failure mode: the full 25-30 minute timeout elapsed while a
// persistent challenge page silently masqueraded as "worker not yet
// deployed" (readinessState stuck at worker-health-missing) the entire time.
const DEFAULT_TRANSPORT_BLOCK_FAST_FAIL_POLLS = 3;

export const REQUIRED_CLOUDFLARE_CHECKS = Object.freeze([
  'Workers Builds: sekret-backend',
]);

export const OPTIONAL_CLOUDFLARE_CHECKS = Object.freeze([
  'Cloudflare Pages',
]);

const TERMINAL_FAILURES = new Set([
  'action_required',
  'cancelled',
  'failure',
  'stale',
  'timed_out',
]);

function newestFirst(a, b) {
  const aTime = Date.parse(a.completed_at ?? a.started_at ?? '1970-01-01T00:00:00Z');
  const bTime = Date.parse(b.completed_at ?? b.started_at ?? '1970-01-01T00:00:00Z');
  return bTime - aTime;
}

function selectNewestCheck(checkRuns, name) {
  return checkRuns
    .filter((run) => run?.name === name)
    .sort(newestFirst)[0] ?? null;
}

export function evaluateCloudflareChecks(checkRuns, requiredChecks = REQUIRED_CLOUDFLARE_CHECKS) {
  const selected = Object.fromEntries(
    requiredChecks.map((name) => [name, selectNewestCheck(checkRuns, name)]),
  );

  const missing = requiredChecks.filter((name) => !selected[name]);
  const pending = requiredChecks.filter((name) => {
    const run = selected[name];
    return run && run.status !== 'completed';
  });
  const failed = requiredChecks.filter((name) => {
    const run = selected[name];
    return run?.status === 'completed' && TERMINAL_FAILURES.has(run.conclusion);
  });
  const unsuccessful = requiredChecks.filter((name) => {
    const run = selected[name];
    return run?.status === 'completed' && run.conclusion !== 'success';
  });

  return {
    complete: missing.length === 0 && pending.length === 0 && unsuccessful.length === 0,
    missing,
    pending,
    failed,
    unsuccessful,
    selected,
  };
}

export function evaluateReleaseMarker(marker, expectedSha) {
  const actualSha = typeof marker?.commitSha === 'string' ? marker.commitSha.trim().toLowerCase() : '';
  const normalizedExpected = String(expectedSha ?? '').trim().toLowerCase();
  return {
    complete: Boolean(normalizedExpected) && actualSha === normalizedExpected,
    expectedSha: normalizedExpected,
    actualSha: actualSha || null,
    marker: marker && typeof marker === 'object' ? marker : null,
  };
}

export function evaluateWorkerRuntime(health, expectedSha) {
  const normalizedExpected = String(expectedSha ?? '').trim().toLowerCase();
  const releaseSha = typeof health?.releaseSha === 'string' ? health.releaseSha.trim().toLowerCase() : '';
  const version = health?.version && typeof health.version === 'object' ? health.version : null;
  const versionId = typeof version?.id === 'string' ? version.id.trim() : '';
  const versionTag = typeof version?.tag === 'string' ? version.tag.trim().toLowerCase() : '';
  const versionTimestamp = typeof version?.timestamp === 'string' ? version.timestamp : null;
  const healthOk = health?.ok === true;

  return {
    complete: Boolean(normalizedExpected) && healthOk && releaseSha === normalizedExpected,
    healthAvailable: Boolean(health && typeof health === 'object'),
    healthOk,
    expectedSha: normalizedExpected,
    releaseSha: releaseSha || null,
    versionId: versionId || null,
    versionTag: versionTag || null,
    versionTimestamp,
    health: health && typeof health === 'object' ? health : null,
  };
}

export function evaluateCloudflareDeploymentCompletion(checkEvaluation, releaseEvaluation, workerEvaluation) {
  const workerCheckObserved = checkEvaluation.missing.length === 0;
  const workerCheckTerminal = workerCheckObserved && checkEvaluation.pending.length === 0;
  const providerCheckConflict = workerCheckTerminal
    && checkEvaluation.unsuccessful.length > 0
    && workerEvaluation.complete;

  return {
    complete: workerCheckTerminal && releaseEvaluation.complete && workerEvaluation.complete,
    workerCheckObserved,
    workerCheckTerminal,
    providerCheckConflict,
  };
}

export function classifyCloudflareReadiness(checkEvaluation, releaseEvaluation, workerEvaluation) {
  if (checkEvaluation.missing.length > 0) return 'worker-missing';
  if (checkEvaluation.pending.length > 0) return 'worker-pending';
  if (!releaseEvaluation.actualSha) return 'pages-marker-missing';
  if (!releaseEvaluation.complete) return 'pages-marker-stale';
  if (!workerEvaluation?.healthAvailable) return 'worker-health-missing';
  if (!workerEvaluation.healthOk) return 'worker-health-unhealthy';
  if (!workerEvaluation.releaseSha) return 'worker-release-sha-missing';
  if (!workerEvaluation.complete) {
    if (checkEvaluation.failed.length > 0) return 'worker-failed-awaiting-runtime';
    if (checkEvaluation.unsuccessful.length > 0) return 'worker-unsuccessful-awaiting-runtime';
    return 'worker-release-sha-stale';
  }
  if (checkEvaluation.unsuccessful.length > 0) return 'ready-with-provider-check-conflict';
  return 'ready';
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// A transient blip (one poll hitting a challenge page mid-cutover) must not
// trip the fast-fail path — only the SAME block kind repeating, poll after
// poll, distinguishes a persistent Cloudflare interception from noise.
export function trackConsecutiveBlock(state, blocked) {
  if (!blocked) return {kind: null, count: 0};
  if (state.kind === blocked) return {kind: blocked, count: state.count + 1};
  return {kind: blocked, count: 1};
}

async function fetchCheckRuns({repository, sha, token}) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100&filter=all`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'sekret-bip-cloudflare-native-verifier',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub check-runs lookup failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.check_runs) ? payload.check_runs : [];
}

// Returns {json, blocked, status}. `blocked` is 'access', 'challenge', or
// null — distinguishing "Cloudflare intercepted this request" from "the
// endpoint responded (or failed) on its own merits" is the whole point: a
// bare `null` return (the prior behavior) made a Cloudflare challenge page
// indistinguishable from a worker that simply isn't deployed yet.
async function fetchJsonWithNoCache(rawUrl, accessAuth) {
  const url = new URL(rawUrl);
  url.searchParams.set('verify', `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        ...accessAuth.headers,
      },
    });
  } catch {
    return {json: null, blocked: null, status: null};
  }

  const contentType = response.headers.get('content-type') ?? '';
  let blocked = null;
  if (contentType.toLowerCase().startsWith('text/html') && typeof response.clone === 'function') {
    try {
      const body = await response.clone().text();
      if (hasCloudflareAccessHtmlMarker(body)) blocked = 'access';
      else if (hasCloudflareChallengeHtmlMarker(body)) blocked = 'challenge';
    } catch {
      blocked = null;
    }
  }

  if (!response.ok || blocked) return {json: null, blocked, status: response.status};
  const json = await response.json().catch(() => null);
  return {json, blocked: null, status: response.status};
}

async function fetchReleaseMarker(releaseUrl, accessAuth) {
  return fetchJsonWithNoCache(releaseUrl, accessAuth);
}

async function fetchWorkerHealth(backendHealthUrl, accessAuth) {
  return fetchJsonWithNoCache(backendHealthUrl, accessAuth);
}

function publicCheckEvidence(run) {
  if (!run) return null;
  return {
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    detailsUrl: run.details_url,
    checkRunUrl: run.html_url,
    externalId: run.external_id,
  };
}

export function buildCloudflareEvidence({
  repository,
  sha,
  releaseUrl,
  backendHealthUrl,
  checkEvaluation,
  releaseEvaluation,
  workerEvaluation,
  allCheckRuns = [],
  startedAtMs,
  observedAtMs,
  status,
  observerError = null,
}) {
  const readinessState = classifyCloudflareReadiness(checkEvaluation, releaseEvaluation, workerEvaluation);
  const completion = evaluateCloudflareDeploymentCompletion(checkEvaluation, releaseEvaluation, workerEvaluation);
  const complete = completion.complete;
  const optionalChecks = Object.fromEntries(
    OPTIONAL_CLOUDFLARE_CHECKS.map((name) => [name, publicCheckEvidence(selectNewestCheck(allCheckRuns, name))]),
  );

  return {
    version: 5,
    repository,
    commitSha: sha,
    expectedSha: String(sha ?? '').trim().toLowerCase(),
    status,
    complete,
    readinessState,
    providerCheckConflict: completion.providerCheckConflict,
    startedAt: new Date(startedAtMs).toISOString(),
    observedAt: new Date(observedAtMs).toISOString(),
    elapsedMs: Math.max(0, observedAtMs - startedAtMs),
    verifiedAt: complete ? new Date(observedAtMs).toISOString() : null,
    deploymentMode: 'cloudflare-native-git-integration',
    apiTokenRequiredInGitHub: false,
    observerError,
    checkSummary: {
      missing: [...checkEvaluation.missing],
      pending: [...checkEvaluation.pending],
      failed: [...checkEvaluation.failed],
      unsuccessful: [...checkEvaluation.unsuccessful],
    },
    requiredChecks: Object.fromEntries(
      REQUIRED_CLOUDFLARE_CHECKS.map((name) => [name, publicCheckEvidence(checkEvaluation.selected[name])]),
    ),
    optionalChecks,
    pagesRelease: {
      url: releaseUrl,
      commitSha: releaseEvaluation.actualSha,
      expectedSha: releaseEvaluation.expectedSha,
      complete: releaseEvaluation.complete,
      marker: releaseEvaluation.marker,
    },
    workerRuntime: {
      url: backendHealthUrl,
      expectedSha: workerEvaluation.expectedSha,
      releaseSha: workerEvaluation.releaseSha,
      versionId: workerEvaluation.versionId,
      versionTag: workerEvaluation.versionTag,
      versionTimestamp: workerEvaluation.versionTimestamp,
      healthOk: workerEvaluation.healthOk,
      complete: workerEvaluation.complete,
    },
  };
}

function writeEvidence(evidencePath, evidence) {
  fs.mkdirSync(path.dirname(evidencePath), {recursive: true});
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function waitingFor(checkEvaluation, releaseEvaluation, workerEvaluation) {
  return [
    ...checkEvaluation.missing,
    ...checkEvaluation.pending,
    ...(workerEvaluation.complete ? [] : checkEvaluation.unsuccessful),
    ...(releaseEvaluation.complete ? [] : [`Pages release marker ${releaseEvaluation.actualSha ?? 'missing'} -> ${releaseEvaluation.expectedSha}`]),
    ...(workerEvaluation.complete ? [] : [`Worker release SHA ${workerEvaluation.releaseSha ?? 'missing'} -> ${workerEvaluation.expectedSha}`]),
  ];
}

async function verifyCloudflareNativeDeploy() {
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  const token = process.env.GITHUB_TOKEN;
  const releaseUrl = process.env.FRONTEND_RELEASE_URL ?? 'https://sekretbip.net/release.json';
  const backendHealthUrl = process.env.BACKEND_HEALTH_URL ?? 'https://api.sekretbip.net/health';
  const timeoutMs = Number(process.env.CLOUDFLARE_CHECK_TIMEOUT_MS ?? 25 * 60 * 1000);
  const pollMs = Number(process.env.CLOUDFLARE_CHECK_POLL_MS ?? 10_000);
  const transportBlockFastFailPolls = Number(
    process.env.CLOUDFLARE_TRANSPORT_BLOCK_FAST_FAIL_POLLS ?? DEFAULT_TRANSPORT_BLOCK_FAST_FAIL_POLLS,
  );
  const evidencePath = process.env.CLOUDFLARE_EVIDENCE_PATH ?? 'artifacts/cloudflare-native-deploy.json';
  const accessAuth = resolveCloudflareAccessServiceAuth();

  if (!repository || !sha || !token) {
    throw new Error('GITHUB_REPOSITORY, GITHUB_SHA, and GITHUB_TOKEN are required.');
  }

  const startedAtMs = Date.now();
  const deadline = startedAtMs + timeoutMs;
  let consecutiveMarkerBlock = {kind: null, count: 0};
  let consecutiveHealthBlock = {kind: null, count: 0};
  let checkEvaluation = evaluateCloudflareChecks([]);
  let releaseEvaluation = evaluateReleaseMarker(null, sha);
  let workerEvaluation = evaluateWorkerRuntime(null, sha);
  let allCheckRuns = [];
  let latestEvidence = buildCloudflareEvidence({
    repository,
    sha,
    releaseUrl,
    backendHealthUrl,
    checkEvaluation,
    releaseEvaluation,
    workerEvaluation,
    allCheckRuns,
    startedAtMs,
    observedAtMs: startedAtMs,
    status: 'starting',
  });
  writeEvidence(evidencePath, latestEvidence);

  while (Date.now() < deadline) {
    const observedAtMs = Date.now();
    try {
      allCheckRuns = await fetchCheckRuns({repository, sha, token});
    } catch (error) {
      latestEvidence = buildCloudflareEvidence({
        repository,
        sha,
        releaseUrl,
        backendHealthUrl,
        checkEvaluation,
        releaseEvaluation,
        workerEvaluation,
        allCheckRuns,
        startedAtMs,
        observedAtMs,
        status: 'observer-failed',
        observerError: error instanceof Error ? error.message : String(error),
      });
      writeEvidence(evidencePath, latestEvidence);
      throw error;
    }

    checkEvaluation = evaluateCloudflareChecks(allCheckRuns);
    const fallbackFetchResult = {json: null, blocked: null, status: null};
    const [markerFetch, healthFetch] = await Promise.all([
      fetchReleaseMarker(releaseUrl, accessAuth).catch(() => fallbackFetchResult),
      fetchWorkerHealth(backendHealthUrl, accessAuth).catch(() => fallbackFetchResult),
    ]);
    releaseEvaluation = evaluateReleaseMarker(markerFetch.json, sha);
    workerEvaluation = evaluateWorkerRuntime(healthFetch.json, sha);

    consecutiveMarkerBlock = trackConsecutiveBlock(consecutiveMarkerBlock, markerFetch.blocked);
    consecutiveHealthBlock = trackConsecutiveBlock(consecutiveHealthBlock, healthFetch.blocked);

    const persistentBlock =
      consecutiveMarkerBlock.count >= transportBlockFastFailPolls
        ? {surface: 'frontend', kind: consecutiveMarkerBlock.kind}
        : consecutiveHealthBlock.count >= transportBlockFastFailPolls
          ? {surface: 'backend', kind: consecutiveHealthBlock.kind}
          : null;

    if (persistentBlock) {
      const readinessState =
        persistentBlock.kind === 'access' ? 'cloudflare-access-intercepted' : 'cloudflare-challenge-intercepted';
      latestEvidence = {
        ...buildCloudflareEvidence({
          repository,
          sha,
          releaseUrl,
          backendHealthUrl,
          checkEvaluation,
          releaseEvaluation,
          workerEvaluation,
          allCheckRuns,
          startedAtMs,
          observedAtMs,
          status: 'failed',
        }),
        readinessState,
        transportBlocker: {
          surface: persistentBlock.surface,
          kind: persistentBlock.kind,
          consecutivePolls: persistentBlock.surface === 'frontend' ? consecutiveMarkerBlock.count : consecutiveHealthBlock.count,
          accessServiceAuthConfigured: accessAuth.configured,
        },
      };
      writeEvidence(evidencePath, latestEvidence);

      const guidance =
        persistentBlock.kind === 'access'
          ? 'This is a Cloudflare Access (Zero Trust SSO) login page. Configure CLOUDFLARE_ACCESS_CLIENT_ID/SECRET as a service-token bypass for this route, or add an Access bypass policy.'
          : 'This is a Cloudflare WAF-layer bot/managed-challenge page (Bot Fight Mode, "I\'m Under Attack Mode", or a custom WAF rule). An Access service token does NOT clear this — add a WAF/Bot Fight Mode exception for this route.';
      throw new Error(
        `Cloudflare is intercepting the ${persistentBlock.surface} health/release probe with a ${persistentBlock.kind} page across ${transportBlockFastFailPolls} consecutive polls — failing fast instead of waiting out the full timeout. ${guidance} evidence: ${evidencePath}`,
      );
    }

    const readinessState = classifyCloudflareReadiness(checkEvaluation, releaseEvaluation, workerEvaluation);
    const completion = evaluateCloudflareDeploymentCompletion(checkEvaluation, releaseEvaluation, workerEvaluation);
    const complete = completion.complete;

    latestEvidence = buildCloudflareEvidence({
      repository,
      sha,
      releaseUrl,
      backendHealthUrl,
      checkEvaluation,
      releaseEvaluation,
      workerEvaluation,
      allCheckRuns,
      startedAtMs,
      observedAtMs,
      status: complete ? 'succeeded' : 'observing',
    });
    writeEvidence(evidencePath, latestEvidence);

    if (complete) {
      console.log(JSON.stringify(latestEvidence, null, 2));
      return;
    }

    const blockers = [...new Set(waitingFor(checkEvaluation, releaseEvaluation, workerEvaluation))];
    console.log(
      `Waiting for exact production release [${readinessState}] after ${latestEvidence.elapsedMs}ms: ${blockers.join(', ')}`,
    );
    await sleep(pollMs);
  }

  const observedAtMs = Date.now();
  latestEvidence = buildCloudflareEvidence({
    repository,
    sha,
    releaseUrl,
    backendHealthUrl,
    checkEvaluation,
    releaseEvaluation,
    workerEvaluation,
    allCheckRuns,
    startedAtMs,
    observedAtMs,
    status: 'timed-out',
  });
  writeEvidence(evidencePath, latestEvidence);

  throw new Error(
    `Timed out waiting for the exact production release [${latestEvidence.readinessState}]. Worker missing: ${checkEvaluation.missing.join(', ') || 'none'}; Worker pending: ${checkEvaluation.pending.join(', ') || 'none'}; Worker unsuccessful: ${checkEvaluation.unsuccessful.join(', ') || 'none'}; Pages marker: ${releaseEvaluation.actualSha ?? 'missing'}; Worker release SHA: ${workerEvaluation.releaseSha ?? 'missing'}; expected: ${sha}; evidence: ${evidencePath}`,
  );
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  verifyCloudflareNativeDeploy().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exit(1);
  });
}
