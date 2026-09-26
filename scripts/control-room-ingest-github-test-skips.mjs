import path from 'node:path';
import {
  buildSkipObservation,
  parseSkipMarker,
  writeSkipReport,
} from './control-room-test-skips.mjs';

const root = process.cwd();
const repository = process.env.GITHUB_REPOSITORY || 'jussray/Sekret-Bip';
const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const requestedRunId = process.env.CONTROL_ROOM_GITHUB_RUN_ID;
const requestedHeadSha = process.env.CONTROL_ROOM_GITHUB_HEAD_SHA?.trim().toLowerCase() || null;
const shouldIngest = process.env.CONTROL_ROOM_GITHUB_INGEST === '1';
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function required(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sanitizeRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error('GITHUB_REPOSITORY must use owner/name format.');
  return value;
}

function githubHeaders(accept = 'application/vnd.github+json') {
  return {
    accept,
    authorization: `Bearer ${required('GH_TOKEN or GITHUB_TOKEN', githubToken)}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'sekret-bip-control-room',
  };
}

async function githubJson(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, { headers: githubHeaders() });
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub ${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  return body ? JSON.parse(body) : null;
}

async function githubText(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, { headers: githubHeaders() });
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub ${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  return body;
}

async function supabaseRequest(pathname, options = {}) {
  if (!shouldIngest) return null;
  const url = required('SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)', supabaseUrl);
  const key = required('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
  const response = await fetch(`${url.replace(/\/$/, '')}${pathname}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  return body ? JSON.parse(body) : null;
}

function runId() {
  const value = Number(required('CONTROL_ROOM_GITHUB_RUN_ID', requestedRunId));
  if (!Number.isInteger(value) || value <= 0) throw new Error('CONTROL_ROOM_GITHUB_RUN_ID must be a positive workflow run id.');
  return value;
}

async function collectObservations(repo, run, jobs) {
  const trusted = {
    repository: repo,
    headSha: run.head_sha,
    surface: 'github_actions',
    workflow: run.name,
    runId: run.id,
  };
  const observations = [];

  if (run.conclusion === 'skipped') {
    observations.push(buildSkipObservation({
      ...trusted,
      runner: 'github_actions_workflow',
      command: run.path || run.name,
      testId: `workflow:${run.name}`,
      reason: 'GitHub concluded the workflow skipped before its proof jobs executed.',
      classification: 'workflow_skipped',
    }));
  }

  for (const job of jobs) {
    if (job.conclusion === 'skipped') {
      observations.push(buildSkipObservation({
        ...trusted,
        runner: 'github_actions_job',
        command: run.path || run.name,
        testId: `job:${job.name}`,
        reason: `GitHub job concluded skipped: ${job.name}.`,
        classification: 'job_skipped',
        job: job.name,
      }));
    }
    let logs = '';
    try {
      logs = await githubText(`/repos/${repo}/actions/jobs/${job.id}/logs`);
    } catch (error) {
      if (job.conclusion !== 'skipped') throw error;
      continue;
    }
    for (const line of logs.split(/\r?\n/)) {
      const observation = parseSkipMarker(line, { ...trusted, job: job.name });
      if (observation) observations.push(observation);
    }
  }

  return [...new Map(observations.map((item) => [item.fingerprint, item])).values()];
}

async function ingestObservation(item) {
  const metadata = {
    source: 'github_actions_test_skip',
    repository: item.repository,
    head_sha: item.head_sha,
    runner: item.runner,
    command: item.command,
    test_id: item.test_id,
    test_file: item.test_file,
    reason: item.reason,
    classification: item.classification,
    workflow: item.workflow,
    run_id: item.run_id,
    job: item.job,
    proof_cookie: item.proof_cookie,
    authority: false,
  };
  const inserted = await supabaseRequest('/rest/v1/audit_events', {
    method: 'POST',
    body: JSON.stringify({
      user_id: null,
      event_type: 'github_actions_test_skipped',
      screen: 'github-actions',
      severity: 'warning',
      message: `${item.test_id} was skipped on ${item.head_sha.slice(0, 12)} and requires investigation before it can count as proof.`,
      metadata,
      resolved: false,
    }),
  });
  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error(`audit_events insert did not return an id for ${item.fingerprint}.`);
  await supabaseRequest('/rest/v1/rpc/upsert_control_room_issue', {
    method: 'POST',
    body: JSON.stringify({
      p_fingerprint: item.fingerprint,
      p_source: 'github_actions',
      p_category: 'test-skip',
      p_severity: 'warning',
      p_status: 'open',
      p_title: `Skipped proof witness: ${item.test_id}`,
      p_summary: `${item.reason} A skip is not a pass and cannot satisfy required exact-head proof.`,
      p_suggested_fix: 'Classify why the test skipped, restore any missing prerequisite or mark the witness inapplicable with explicit authority, then execute the required real path.',
      p_affected_surface: 'github-actions',
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    }),
  });
}

const repo = sanitizeRepository(repository);
const id = runId();
const run = await githubJson(`/repos/${repo}/actions/runs/${id}`);
if (requestedHeadSha && run.head_sha?.toLowerCase() !== requestedHeadSha) {
  throw new Error(`Requested head ${requestedHeadSha} does not match run head ${run.head_sha}.`);
}
const jobsResponse = await githubJson(`/repos/${repo}/actions/runs/${id}/jobs?per_page=100`);
const jobs = Array.isArray(jobsResponse?.jobs) ? jobsResponse.jobs : [];
const observations = await collectObservations(repo, run, jobs);

if (shouldIngest) {
  for (const observation of observations) await ingestObservation(observation);
}

const { report, reportPath } = writeSkipReport(observations, {
  root,
  filename: 'github-test-skips-latest.json',
  source: 'github_actions',
  extra: {
    repository: repo,
    requested_run_id: id,
    head_sha: run.head_sha,
    workflow_name: run.name,
    workflow_conclusion: run.conclusion,
    workflow_skip_count: observations.filter((item) => item.classification === 'workflow_skipped').length,
    job_skip_count: observations.filter((item) => item.classification === 'job_skipped').length,
    marker_skip_count: observations.filter((item) => !['workflow_skipped', 'job_skipped'].includes(item.classification)).length,
    ingested: shouldIngest,
  },
});

console.log(JSON.stringify({
  report_path: path.relative(root, reportPath),
  skip_count: report.skip_count,
  workflow_skip_count: report.workflow_skip_count,
  job_skip_count: report.job_skip_count,
  marker_skip_count: report.marker_skip_count,
  ingested: shouldIngest,
}, null, 2));
