import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const RELEASE_OBSERVATION_MARKER = '<!-- sekret-production-release-observation -->';
export const RELEASE_BLOCKER_MARKER = '<!-- sekret-production-release-blocker -->';

function normalizeSha(value) {
  return String(value ?? '').trim().toLowerCase();
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value;
}

export function validateReleaseEvidence(evidence, expectedSha) {
  const normalizedExpected = normalizeSha(expectedSha);
  if (!normalizedExpected) {
    throw new Error('Expected release SHA is required.');
  }

  const payload = assertObject(evidence, 'Release evidence');
  if (payload.version !== 5) {
    throw new Error(`Release evidence version 5 is required; observed ${payload.version ?? 'missing'}.`);
  }

  const observedSha = normalizeSha(payload.commitSha || payload.expectedSha);
  if (observedSha !== normalizedExpected) {
    throw new Error(
      `Release evidence SHA mismatch: expected ${normalizedExpected}, observed ${observedSha || 'missing'}.`,
    );
  }

  if (payload.complete !== true || payload.status !== 'succeeded') {
    throw new Error('Release evidence is not complete and succeeded.');
  }

  const pagesRelease = assertObject(payload.pagesRelease, 'Pages release evidence');
  const pagesSha = normalizeSha(pagesRelease.commitSha || pagesRelease.expectedSha);
  if (pagesRelease.complete !== true || pagesSha !== normalizedExpected) {
    throw new Error(
      `Pages release marker is not exact: expected ${normalizedExpected}, observed ${pagesSha || 'missing'}.`,
    );
  }

  const workerRuntime = assertObject(payload.workerRuntime, 'Worker runtime evidence');
  const workerExpectedSha = normalizeSha(workerRuntime.expectedSha);
  const workerReleaseSha = normalizeSha(workerRuntime.releaseSha);
  if (
    workerRuntime.complete !== true
    || workerRuntime.healthOk !== true
    || workerExpectedSha !== normalizedExpected
    || workerReleaseSha !== normalizedExpected
  ) {
    throw new Error(
      `Worker runtime identity is not exact: expected ${normalizedExpected}, observed ${workerReleaseSha || 'missing'}.`,
    );
  }

  const requiredChecks = assertObject(payload.requiredChecks, 'Required Cloudflare checks');
  const failedChecks = Object.entries(requiredChecks)
    .filter(([, check]) => check?.status !== 'completed' || check?.conclusion !== 'success')
    .map(([name]) => name);
  if (failedChecks.length > 0) {
    throw new Error(`Required Cloudflare checks are not successful: ${failedChecks.join(', ')}.`);
  }

  return {
    evidence: payload,
    expectedSha: normalizedExpected,
    pagesRelease,
    workerRuntime,
    requiredChecks,
  };
}

function safeValue(value, fallback = 'not reported') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeList(value) {
  return Array.isArray(value) && value.length > 0
    ? value.map((entry) => safeValue(entry)).join(', ')
    : 'none';
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function buildReleaseObservationComment({
  evidence,
  expectedSha,
  repository,
  runId,
  serverUrl = 'https://github.com',
}) {
  const validated = validateReleaseEvidence(evidence, expectedSha);
  const marker = validated.pagesRelease.marker && typeof validated.pagesRelease.marker === 'object'
    ? validated.pagesRelease.marker
    : {};
  const workerChecks = Object.entries(validated.requiredChecks)
    .map(([name, check]) => `- ${name}: \`${safeValue(check?.conclusion)}\``)
    .join('\n');
  const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;

  return `${RELEASE_OBSERVATION_MARKER}
## VERIFIED: exact production release observed

- Exact main SHA: \`${validated.expectedSha}\`
- Release verifier: \`${safeValue(validated.evidence.status)}\`
- Verified at: \`${safeValue(validated.evidence.verifiedAt)}\`
- Pages marker SHA: \`${safeValue(validated.pagesRelease.commitSha)}\`
- Pages environment: \`${safeValue(marker.environment)}\`
- Pages branch: \`${safeValue(marker.branch)}\`
- Deployment provider: \`${safeValue(marker.deploymentProvider)}\`
- Deployment ID: \`${safeValue(marker.deploymentId)}\`
- Worker release SHA: \`${safeValue(validated.workerRuntime.releaseSha)}\`
- Worker version ID: \`${safeValue(validated.workerRuntime.versionId)}\`
- Worker version tag: \`${safeValue(validated.workerRuntime.versionTag)}\`
- Backend health: \`passed\`
- Supabase runtime contracts: \`passed\`
- Production Playwright: \`passed\`
- Workflow run: ${runUrl}

### Required Cloudflare checks
${workerChecks}

This receipt is generated only after the exact-SHA Cloudflare observer, Pages release marker, exact live Worker release SHA, backend health, runtime-contract health, and production Playwright steps all pass. Cloudflare version metadata is retained as provenance only. It updates the existing marked receipt instead of creating duplicate release claims.
`;
}

export function buildReleaseBlockerComment({
  evidence,
  schemaEvidence,
  expectedSha,
  repository,
  runId,
  stepOutcomes = {},
  serverUrl = 'https://github.com',
}) {
  const normalizedExpected = normalizeSha(expectedSha);
  if (!normalizedExpected) throw new Error('Expected release SHA is required.');

  const payload = objectOrEmpty(evidence);
  const schema = objectOrEmpty(schemaEvidence);
  const pagesRelease = objectOrEmpty(payload.pagesRelease);
  const workerRuntime = objectOrEmpty(payload.workerRuntime);
  const checkSummary = objectOrEmpty(payload.checkSummary);
  const requiredChecks = objectOrEmpty(payload.requiredChecks);
  const observedSha = normalizeSha(payload.commitSha);
  const pagesSha = normalizeSha(pagesRelease.commitSha);
  const workerReleaseSha = normalizeSha(workerRuntime.releaseSha);
  const workerVersionTag = normalizeSha(workerRuntime.versionTag);
  const runUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
  const stepLines = Object.entries(objectOrEmpty(stepOutcomes))
    .map(([name, outcome]) => `- ${name}: \`${safeValue(outcome)}\``)
    .join('\n') || '- no step outcomes were reported';
  const workerLines = Object.entries(requiredChecks)
    .map(([name, check]) => `- ${name}: status \`${safeValue(check?.status)}\`, conclusion \`${safeValue(check?.conclusion)}\``)
    .join('\n') || '- no required check result was retained';
  const schemaRetained = Object.keys(schema).length > 0;
  const schemaStatus = schemaRetained ? safeValue(schema.status, 'unknown') : 'not retained';
  const schemaVerified = schemaRetained && schema.verified === true ? 'yes' : 'no';

  return `${RELEASE_BLOCKER_MARKER}
## BLOCKED: exact production release not verified

- Intended main SHA: \`${normalizedExpected}\`
- Evidence SHA: \`${observedSha || 'not observed'}\`
- Evidence version: \`${safeValue(payload.version, 'missing')}\`
- Evidence status: \`${safeValue(payload.status, 'evidence missing')}\`
- Readiness state: \`${safeValue(payload.readinessState, 'unknown')}\`
- Pages marker SHA: \`${pagesSha || 'not observed'}\`
- Pages marker exact: \`${pagesRelease.complete === true && pagesSha === normalizedExpected ? 'yes' : 'no'}\`
- Worker release SHA: \`${workerReleaseSha || 'missing'}\`
- Worker release exact: \`${workerRuntime.complete === true && workerReleaseSha === normalizedExpected ? 'yes' : 'no'}\`
- Worker version ID: \`${safeValue(workerRuntime.versionId, 'missing')}\`
- Worker version tag: \`${workerVersionTag || 'missing'}\`
- Workflow run: ${runUrl}

### Verification step outcomes
${stepLines}

### Supabase production schema witness
- Evidence retained: \`${schemaRetained ? 'yes' : 'no'}\`
- Witness status: \`${schemaStatus}\`
- Repository migration head: \`${safeValue(schema.expectedVersion, 'not observed')}\`
- Live migration head: \`${safeValue(schema.liveMaxVersion, 'not observed')}\`
- Witness verified: \`${schemaVerified}\`
- Witness error: \`${safeValue(schema.error, 'none reported')}\`

### Required Cloudflare checks
${workerLines}

### Retained blockers
- Missing checks: \`${safeList(checkSummary.missing)}\`
- Pending checks: \`${safeList(checkSummary.pending)}\`
- Failed checks: \`${safeList(checkSummary.failed)}\`
- Unsuccessful checks: \`${safeList(checkSummary.unsuccessful)}\`
- Observer error: \`${safeValue(payload.observerError, 'none reported')}\`

This is a blocked-attempt receipt, not a production pass. It must never be used as exact-release, Worker-runtime, backend-health, Supabase-health, Playwright, or launch evidence. A separate VERIFIED receipt is written only after every required production witness succeeds.
`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function githubRequest(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  const body = await readResponseBody(response);
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`GitHub API request failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return body;
}

export async function upsertReleaseObservation({
  fetchImpl = fetch,
  apiUrl = 'https://api.github.com',
  token,
  repository,
  issueNumber,
  comment,
  marker = RELEASE_OBSERVATION_MARKER,
}) {
  if (!token) throw new Error('GITHUB_TOKEN is required.');
  if (!repository || !repository.includes('/')) throw new Error('GITHUB_REPOSITORY is required.');
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error('A positive release observation issue number is required.');
  }
  if (!marker || !comment.includes(marker)) {
    throw new Error('The release observation comment must include its marker.');
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'sekret-bip-production-release-observer',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const commentsUrl = `${apiUrl}/repos/${repository}/issues/${issueNumber}/comments?per_page=100`;
  const comments = await githubRequest(fetchImpl, commentsUrl, {headers});
  const existing = Array.isArray(comments)
    ? comments.find((entry) => typeof entry?.body === 'string' && entry.body.includes(marker))
    : null;

  if (existing?.id) {
    await githubRequest(fetchImpl, `${apiUrl}/repos/${repository}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({body: comment}),
    });
    return {action: 'updated', commentId: existing.id};
  }

  const created = await githubRequest(fetchImpl, `${apiUrl}/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({body: comment}),
  });
  return {action: 'created', commentId: created?.id ?? null};
}

function readEvidence(evidencePath, expectedSha, fallbackStatus) {
  if (fs.existsSync(evidencePath)) {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  }
  return {
    version: 5,
    commitSha: null,
    expectedSha: normalizeSha(expectedSha),
    status: fallbackStatus,
    complete: false,
    readinessState: 'evidence-missing',
    observerError: `Evidence file was not found at ${evidencePath}.`,
    checkSummary: {missing: [], pending: [], failed: [], unsuccessful: []},
    requiredChecks: {},
    pagesRelease: {commitSha: null, expectedSha: normalizeSha(expectedSha), complete: false},
    workerRuntime: {
      expectedSha: normalizeSha(expectedSha),
      releaseSha: null,
      versionId: null,
      versionTag: null,
      healthOk: false,
      complete: false,
    },
  };
}

function readOptionalEvidence(evidencePath) {
  if (!evidencePath || !fs.existsSync(evidencePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch {
    return {status: 'evidence-invalid', verified: false, error: 'invalid_evidence_json'};
  }
}

function parseStepOutcomes(value) {
  if (!value) return {};
  try {
    return objectOrEmpty(JSON.parse(value));
  } catch {
    return {parse_error: 'invalid RELEASE_STEP_OUTCOMES JSON'};
  }
}

export async function publishProductionReleaseObservation(env = process.env) {
  const evidencePath = env.CLOUDFLARE_EVIDENCE_PATH || 'artifacts/cloudflare-native-deploy.json';
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const issueNumber = Number(env.RELEASE_OBSERVATION_ISSUE || '696');
  const comment = buildReleaseObservationComment({
    evidence,
    expectedSha: env.EXPECTED_RELEASE_SHA || env.GITHUB_SHA,
    repository: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID,
    serverUrl: env.GITHUB_SERVER_URL || 'https://github.com',
  });

  const result = await upsertReleaseObservation({
    apiUrl: env.GITHUB_API_URL || 'https://api.github.com',
    token: env.GITHUB_TOKEN,
    repository: env.GITHUB_REPOSITORY,
    issueNumber,
    comment,
  });
  console.log(JSON.stringify(result));
  return result;
}

export async function publishProductionReleaseBlocker(env = process.env) {
  const evidencePath = env.CLOUDFLARE_EVIDENCE_PATH || 'artifacts/cloudflare-native-deploy.json';
  const schemaEvidencePath = env.SUPABASE_SCHEMA_EVIDENCE_PATH || 'artifacts/supabase-production-schema.json';
  const expectedSha = env.EXPECTED_RELEASE_SHA || env.GITHUB_SHA;
  const stepOutcomes = parseStepOutcomes(env.RELEASE_STEP_OUTCOMES);
  const schemaEvidence = readOptionalEvidence(schemaEvidencePath);
  const evidence = readEvidence(evidencePath, expectedSha, env.VERIFICATION_JOB_STATUS || 'failed');

  if (
    stepOutcomes.supabase_schema === 'failure'
    && schemaEvidence
    && !fs.existsSync(evidencePath)
  ) {
    evidence.readinessState = `supabase-${safeValue(schemaEvidence.status, 'blocked')}`;
    evidence.observerError = null;
  }

  const issueNumber = Number(env.RELEASE_OBSERVATION_ISSUE || '696');
  const comment = buildReleaseBlockerComment({
    evidence,
    schemaEvidence,
    expectedSha,
    repository: env.GITHUB_REPOSITORY,
    runId: env.GITHUB_RUN_ID,
    stepOutcomes,
    serverUrl: env.GITHUB_SERVER_URL || 'https://github.com',
  });

  const result = await upsertReleaseObservation({
    apiUrl: env.GITHUB_API_URL || 'https://api.github.com',
    token: env.GITHUB_TOKEN,
    repository: env.GITHUB_REPOSITORY,
    issueNumber,
    comment,
    marker: RELEASE_BLOCKER_MARKER,
  });
  console.log(JSON.stringify(result));
  return result;
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  const publish = process.env.RELEASE_OBSERVATION_MODE === 'blocked'
    ? publishProductionReleaseBlocker
    : publishProductionReleaseObservation;
  publish().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
