import fs from 'node:fs';
import path from 'node:path';
import failureIdentity from './control-room-failure-identity.cjs';

const { buildFailureIdentity, canonicalFailureKey } = failureIdentity;
const root = process.cwd();
const reportDir = path.join(root, 'reports', 'control-room');
const reportPath = path.join(reportDir, 'github-failures-latest.json');

const repository = process.env.GITHUB_REPOSITORY || 'jussray/Sekret-Bip';
const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const requestedPr = process.env.CONTROL_ROOM_GITHUB_PR || null;
const requestedHeadSha = process.env.CONTROL_ROOM_GITHUB_HEAD_SHA || null;
const requestedRunId = process.env.CONTROL_ROOM_GITHUB_RUN_ID || null;
const mainBranch = process.env.CONTROL_ROOM_GITHUB_MAIN_BRANCH || 'main';
const shouldIngest = process.env.CONTROL_ROOM_GITHUB_INGEST === '1';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAILURE_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure',
  'stale',
]);

function required(name, value) {
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sanitizeRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    throw new Error('GITHUB_REPOSITORY must use owner/name format.');
  }
  return value;
}

function sanitizeBranch(value) {
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) throw new Error('CONTROL_ROOM_GITHUB_MAIN_BRANCH is invalid.');
  return value;
}

function githubHeaders() {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${required('GH_TOKEN or GITHUB_TOKEN', githubToken)}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'sekret-bip-control-room',
  };
}

async function githubRequest(pathname) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    headers: githubHeaders(),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub ${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  }
  return body ? JSON.parse(body) : null;
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
  if (!response.ok) {
    throw new Error(`Supabase ${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  }
  return body ? JSON.parse(body) : null;
}

function classifyRun(run, jobs) {
  if (run.conclusion === 'startup_failure') return 'runner_startup_failure';
  if (!jobs.length) return 'workflow_no_jobs';

  const failedJobs = jobs.filter((job) => FAILURE_CONCLUSIONS.has(job.conclusion));
  const evidenceJobs = failedJobs.length > 0 ? failedJobs : jobs;
  const jobsWithSteps = evidenceJobs.filter((job) => Array.isArray(job.steps) && job.steps.length > 0);
  if (jobsWithSteps.length === 0) return 'runner_startup_failure';

  const executedSteps = jobsWithSteps.flatMap((job) => job.steps).filter((step) =>
    step.status === 'completed' || step.started_at || step.completed_at,
  );
  if (executedSteps.length === 0) return 'runner_startup_failure';

  return 'workflow_step_failure';
}

function severityFor(failureClass) {
  return failureClass === 'workflow_step_failure' ? 'error' : 'warning';
}

function suggestedFix(failureClass) {
  if (failureClass === 'runner_startup_failure' || failureClass === 'workflow_no_jobs') {
    return 'Look to Founder Control Room first. Run local verification, preserve the exact-head failure as infrastructure evidence, and do not change application code until a real failing step or log exists.';
  }
  return 'Inspect the failing GitHub step, reproduce it through Founder Control Room local verification, fix the smallest supported cause, rerun locally, then rerun exact-head Actions.';
}

function summarizeJobs(jobs) {
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    started_at: job.started_at || null,
    completed_at: job.completed_at || null,
    step_count: Array.isArray(job.steps) ? job.steps.length : 0,
    failed_steps: Array.isArray(job.steps)
      ? job.steps
          .filter((step) => FAILURE_CONCLUSIONS.has(step.conclusion))
          .map((step) => ({ number: step.number, name: step.name, conclusion: step.conclusion }))
      : [],
  }));
}

function failedJobConclusion(jobs) {
  return jobs.find((job) => FAILURE_CONCLUSIONS.has(job.conclusion))?.conclusion || null;
}

function isFailedRun(run, jobs) {
  return FAILURE_CONCLUSIONS.has(run.conclusion) || Boolean(failedJobConclusion(jobs));
}

function scopeLabel(item) {
  return item.pr_number ? `PR #${item.pr_number}` : `branch ${item.head_ref || mainBranch}`;
}

function receiptFromEvidence(item, job, step = null) {
  const infrastructureFailure = item.failure_class !== 'workflow_step_failure';
  const rawFailureKey = infrastructureFailure
    ? `workflow-infrastructure-${item.workflow_name}`
    : step?.name || job?.name || item.workflow_name;
  const identity = buildFailureIdentity({
    repository: item.repository,
    headSha: item.head_sha,
    failureKey: canonicalFailureKey(rawFailureKey),
    correlatable: true,
    source: 'github_actions',
    evidence: {
      workflow_id: item.workflow_id,
      workflow_name: item.workflow_name,
      run_id: item.run_id,
      run_attempt: item.run_attempt,
      job_id: job?.id || null,
      job_name: job?.name || null,
      step_number: step?.number || null,
      step_name: step?.name || null,
      conclusion: step?.conclusion || job?.conclusion || item.conclusion,
      failure_class: item.failure_class,
    },
  });

  return {
    ...identity,
    run_id: item.run_id,
    workflow_id: item.workflow_id,
    workflow_name: item.workflow_name,
    failure_class: item.failure_class,
    severity: item.severity,
    job_id: job?.id || null,
    job_name: job?.name || null,
    step_number: step?.number || null,
    step_name: step?.name || null,
    conclusion: step?.conclusion || job?.conclusion || item.conclusion,
  };
}

function failureReceipts(item) {
  if (item.failure_class !== 'workflow_step_failure') {
    const failedJob = item.jobs.find((job) => FAILURE_CONCLUSIONS.has(job.conclusion)) || item.jobs[0] || null;
    return [receiptFromEvidence(item, failedJob)];
  }

  const receipts = [];
  for (const job of item.jobs) {
    for (const step of job.failed_steps || []) {
      receipts.push(receiptFromEvidence(item, job, step));
    }
    if (FAILURE_CONCLUSIONS.has(job.conclusion) && (!job.failed_steps || job.failed_steps.length === 0)) {
      receipts.push(receiptFromEvidence(item, job));
    }
  }

  if (receipts.length === 0) {
    receipts.push(receiptFromEvidence(item, item.jobs[0] || null));
  }

  const unique = new Map(receipts.map((receipt) => [receipt.proof_cookie, receipt]));
  return [...unique.values()];
}

async function listPullRequests(repo) {
  if (requestedPr) {
    const prNumber = Number(requestedPr);
    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      throw new Error('CONTROL_ROOM_GITHUB_PR must be a positive pull request number.');
    }
    return [await githubRequest(`/repos/${repo}/pulls/${prNumber}`)];
  }

  const pulls = await githubRequest(`/repos/${repo}/pulls?state=open&per_page=100&sort=updated&direction=desc`);
  return Array.isArray(pulls) ? pulls : [];
}

async function pullForRun(repo, run) {
  const number = run?.pull_requests?.[0]?.number;
  if (!number) return null;
  return githubRequest(`/repos/${repo}/pulls/${number}`);
}

async function failureFromRun(repo, run, pull = null) {
  const jobResponse = await githubRequest(`/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`);
  const jobs = Array.isArray(jobResponse?.jobs) ? jobResponse.jobs : [];
  if (!isFailedRun(run, jobs)) return null;

  const resolvedPull = pull || await pullForRun(repo, run);
  const headSha = run.head_sha || resolvedPull?.head?.sha || null;
  if (!headSha || (requestedHeadSha && requestedHeadSha !== headSha)) return null;

  const failureClass = classifyRun(run, jobs);
  return {
    repository: repo,
    pr_number: resolvedPull?.number || null,
    pr_title: resolvedPull?.title || null,
    pr_url: resolvedPull?.html_url || null,
    head_ref: resolvedPull?.head?.ref || run.head_branch || null,
    head_sha: headSha,
    base_ref: resolvedPull?.base?.ref || (run.event === 'push' ? mainBranch : null),
    workflow_id: run.workflow_id,
    workflow_name: run.name,
    run_id: run.id,
    run_number: run.run_number,
    run_attempt: run.run_attempt || 1,
    run_url: run.html_url,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion || failedJobConclusion(jobs) || 'failure',
    created_at: run.created_at,
    updated_at: run.updated_at,
    failure_class: failureClass,
    severity: severityFor(failureClass),
    jobs: summarizeJobs(jobs),
  };
}

async function collectRequestedRun(repo) {
  if (!requestedRunId) return [];
  const runId = Number(requestedRunId);
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new Error('CONTROL_ROOM_GITHUB_RUN_ID must be a positive workflow run id.');
  }
  const run = await githubRequest(`/repos/${repo}/actions/runs/${runId}`);
  const failure = await failureFromRun(repo, run);
  return failure ? [failure] : [];
}

async function collectPullRequestFailures(repo) {
  const pulls = await listPullRequests(repo);
  const failures = [];

  for (const pull of pulls) {
    const headSha = pull?.head?.sha;
    if (!headSha || (requestedHeadSha && requestedHeadSha !== headSha)) continue;

    const runResponse = await githubRequest(
      `/repos/${repo}/actions/runs?event=pull_request&head_sha=${encodeURIComponent(headSha)}&per_page=100`,
    );
    const runs = Array.isArray(runResponse?.workflow_runs) ? runResponse.workflow_runs : [];

    for (const run of runs) {
      if (run.status !== 'completed' || !FAILURE_CONCLUSIONS.has(run.conclusion)) continue;
      const failure = await failureFromRun(repo, run, pull);
      if (failure) failures.push(failure);
    }
  }

  return failures;
}

async function collectMainPushFailures(repo) {
  if (requestedPr) return [];
  const branch = sanitizeBranch(mainBranch);
  const response = await githubRequest(
    `/repos/${repo}/actions/runs?event=push&branch=${encodeURIComponent(branch)}&status=completed&per_page=100`,
  );
  const runs = Array.isArray(response?.workflow_runs) ? response.workflow_runs : [];
  const failures = [];

  for (const run of runs) {
    if (!FAILURE_CONCLUSIONS.has(run.conclusion)) continue;
    const failure = await failureFromRun(repo, run);
    if (failure) failures.push(failure);
  }

  return failures;
}

async function collectFailures(repo) {
  if (requestedRunId) return collectRequestedRun(repo);

  const combined = [
    ...await collectPullRequestFailures(repo),
    ...await collectMainPushFailures(repo),
  ];
  const unique = new Map(combined.map((item) => [item.run_id, item]));
  return [...unique.values()].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function runMetadata(item) {
  return {
    source: 'github_actions',
    repository: item.repository,
    pr_number: item.pr_number,
    pr_title: item.pr_title,
    pr_url: item.pr_url,
    head_ref: item.head_ref,
    head_sha: item.head_sha,
    base_ref: item.base_ref,
    workflow_id: item.workflow_id,
    workflow_name: item.workflow_name,
    run_id: item.run_id,
    run_number: item.run_number,
    run_attempt: item.run_attempt,
    run_url: item.run_url,
    event: item.event,
    conclusion: item.conclusion,
    failure_class: item.failure_class,
  };
}

async function ingestReceipt(item, receipt) {
  const metadata = {
    ...runMetadata(item),
    failure_key: receipt.failure_key,
    incident_fingerprint: receipt.incident_fingerprint,
    proof_cookie: receipt.proof_cookie,
    correlatable: receipt.correlatable,
    job_id: receipt.job_id,
    job_name: receipt.job_name,
    step_number: receipt.step_number,
    step_name: receipt.step_name,
    step_conclusion: receipt.conclusion,
    authority: false,
    merge_authority: false,
    proof_satisfied: false,
    browser_cookie: false,
    authorizing: false,
  };

  const label = scopeLabel(item);
  const evidenceLabel = receipt.step_name || receipt.job_name || item.workflow_name;
  const inserted = await supabaseRequest('/rest/v1/audit_events', {
    method: 'POST',
    body: JSON.stringify({
      user_id: null,
      event_type: `github_actions_${item.failure_class}`,
      screen: item.pr_number ? `github-pr-${item.pr_number}` : `github-branch-${item.head_ref || mainBranch}`,
      severity: item.severity,
      message: `${evidenceLabel} failed for ${label} at ${item.head_sha.slice(0, 12)}.`,
      metadata,
      resolved: false,
    }),
  });

  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error(`audit_events insert did not return an id for receipt ${receipt.proof_cookie}.`);

  const infrastructureFailure = item.failure_class !== 'workflow_step_failure';
  await supabaseRequest('/rest/v1/rpc/upsert_control_room_issue', {
    method: 'POST',
    body: JSON.stringify({
      p_fingerprint: receipt.incident_fingerprint,
      p_source: 'github_actions',
      p_category: 'ci',
      p_severity: item.severity,
      p_status: 'open',
      p_title: `${evidenceLabel} failed on ${label}`,
      p_summary: infrastructureFailure
        ? 'GitHub ended the run without executable step evidence. Treat this as a runner or workflow-startup failure, not a proven code regression.'
        : `GitHub executed a failing proof step (${receipt.failure_key}). Reproduce the same failure key locally on the same clean exact head before treating local and GitHub evidence as one incident.`,
      p_suggested_fix: suggestedFix(item.failure_class),
      p_affected_surface: 'github-actions',
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    }),
  });

  return {
    run_id: item.run_id,
    incident_fingerprint: receipt.incident_fingerprint,
    proof_cookie: receipt.proof_cookie,
    failure_key: receipt.failure_key,
  };
}

const repo = sanitizeRepository(repository);
const failures = await collectFailures(repo);
const receipts = failures.flatMap((failure) => failureReceipts(failure));
const ingested = [];

if (shouldIngest) {
  for (const failure of failures) {
    for (const receipt of failureReceipts(failure)) {
      ingested.push(await ingestReceipt(failure, receipt));
    }
  }
}

fs.mkdirSync(reportDir, { recursive: true });
const report = {
  generated_at: new Date().toISOString(),
  repository: repo,
  mode: shouldIngest ? 'scan-and-ingest' : 'scan-only',
  requested_pr: requestedPr,
  requested_head_sha: requestedHeadSha,
  requested_run_id: requestedRunId,
  main_branch: mainBranch,
  failure_count: failures.length,
  receipt_count: receipts.length,
  pull_request_failure_count: failures.filter((item) => item.pr_number).length,
  main_push_failure_count: failures.filter((item) => !item.pr_number && item.event === 'push').length,
  infrastructure_failure_count: failures.filter((item) => item.failure_class !== 'workflow_step_failure').length,
  code_failure_count: failures.filter((item) => item.failure_class === 'workflow_step_failure').length,
  ingested_count: ingested.length,
  failures,
  receipts,
  guardrails: [
    'Founder Control Room is the first escalation surface whenever GitHub fails.',
    'A run with no executed steps or logs is infrastructure evidence, not proof of a code regression.',
    'Each failing GitHub job or step keeps its own non-authorizing proof receipt; compatible local and GitHub receipts may share only the source-neutral incident fingerprint.',
    'GitHub and Supabase credentials are read only from server-side environment variables and are never written to reports or issue metadata.',
    'This scanner cannot merge, deploy, alter repository code, or apply database migrations.',
  ],
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  report_path: path.relative(root, reportPath),
  mode: report.mode,
  failure_count: report.failure_count,
  receipt_count: report.receipt_count,
  pull_request_failure_count: report.pull_request_failure_count,
  main_push_failure_count: report.main_push_failure_count,
  infrastructure_failure_count: report.infrastructure_failure_count,
  code_failure_count: report.code_failure_count,
  ingested_count: report.ingested_count,
}, null, 2));