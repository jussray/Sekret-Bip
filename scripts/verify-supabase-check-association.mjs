import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {PRODUCTION_PROJECT_REF} from './verify-supabase-history-reconciliation-plan.mjs';

const DEFAULT_OUTPUT_PATH = 'artifacts/supabase-check-association.json';
const UNASSOCIATED_SUMMARY = 'not associated with any Supabase Branch';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSha(value) {
  return clean(value).toLowerCase();
}

function timestamp(value) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? time : 0;
}

function checkRunId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : -1;
}

function supabaseProjectRef(detailsUrl) {
  const value = clean(detailsUrl);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname !== 'supabase.com') return null;
    return url.pathname.match(/^\/dashboard\/project\/([a-z0-9]+)(?:\/|$)/i)?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function summaryText(run) {
  return clean(run?.output?.summary);
}

export function selectLatestSupabaseCheck(checkRuns, expectedSha) {
  const exactSha = normalizeSha(expectedSha);
  return (Array.isArray(checkRuns) ? checkRuns : [])
    .filter((run) => {
      const app = clean(run?.app?.slug) || clean(run?.app?.name);
      return app === 'supabase'
        && normalizeSha(run?.head_sha) === exactSha
        && clean(run?.name) === 'Supabase Preview';
    })
    .sort((left, right) => {
      const leftTime = timestamp(left?.completed_at ?? left?.started_at);
      const rightTime = timestamp(right?.completed_at ?? right?.started_at);
      if (leftTime !== rightTime) return rightTime - leftTime;
      return checkRunId(right?.id) - checkRunId(left?.id);
    })[0] ?? null;
}

export function classifySupabaseAssociation({run, branch}) {
  const normalizedBranch = clean(branch);
  const isProductionBranch = normalizedBranch === 'main';

  if (!run) {
    return {
      schemaVersion: 1,
      projectRef: null,
      expectedProjectRef: PRODUCTION_PROJECT_REF,
      branch: normalizedBranch || null,
      isProductionBranch,
      checkState: 'missing',
      associationState: 'unknown',
      disposition: isProductionBranch ? 'blocked' : 'informational',
      blockReason: isProductionBranch ? 'supabase_check_missing_on_main' : null,
      summary: null,
    };
  }

  const projectRef = supabaseProjectRef(run?.details_url);
  const summary = summaryText(run);
  const unassociated = summary.includes(UNASSOCIATED_SUMMARY);
  const conclusion = clean(run?.conclusion) || null;

  let disposition = 'verified';
  let blockReason = null;
  let associationState = unassociated ? 'unassociated' : 'associated-or-not-explicitly-disconnected';

  if (!projectRef) {
    disposition = 'blocked';
    blockReason = 'supabase_project_unresolved';
    associationState = 'unknown';
  } else if (projectRef !== PRODUCTION_PROJECT_REF) {
    disposition = 'blocked';
    blockReason = 'supabase_project_mismatch';
  } else if (isProductionBranch && unassociated) {
    disposition = 'blocked';
    blockReason = 'supabase_git_branch_unassociated';
  } else if (!isProductionBranch && unassociated) {
    disposition = 'informational';
  }

  return {
    schemaVersion: 1,
    projectRef,
    expectedProjectRef: PRODUCTION_PROJECT_REF,
    branch: normalizedBranch || null,
    isProductionBranch,
    checkState: clean(run?.status) || 'unknown',
    conclusion,
    associationState,
    disposition,
    blockReason,
    summary: summary || null,
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'supabase-check-association-verifier',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub check lookup failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  }
  return response.json();
}

async function fetchAllCheckRuns({repository, sha, token}) {
  const [owner, repo] = clean(repository).split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPOSITORY must use owner/repo format.');

  const runs = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`);
    url.searchParams.set('filter', 'all');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const payload = await githubJson(url, token);
    const pageRuns = Array.isArray(payload?.check_runs) ? payload.check_runs : [];
    runs.push(...pageRuns);
    if (pageRuns.length < 100) break;
  }
  return runs;
}

function writeReceipt(outputPath, receipt) {
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function verifySupabaseCheckAssociation(env = process.env) {
  const repository = clean(env.GITHUB_REPOSITORY);
  const sha = normalizeSha(env.EXPECTED_HEAD_SHA || env.GITHUB_SHA);
  const branch = clean(env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME);
  const token = clean(env.GITHUB_TOKEN);
  const outputPath = clean(env.SUPABASE_CHECK_ASSOCIATION_PATH) || DEFAULT_OUTPUT_PATH;

  if (!repository || !sha || !token) {
    throw new Error('GITHUB_REPOSITORY, EXPECTED_HEAD_SHA/GITHUB_SHA, and GITHUB_TOKEN are required.');
  }

  const runs = await fetchAllCheckRuns({repository, sha, token});
  const run = selectLatestSupabaseCheck(runs, sha);
  const receipt = {
    ...classifySupabaseAssociation({run, branch}),
    repository,
    commitSha: sha,
    checkRunId: run?.id ? String(run.id) : null,
    detailsUrl: clean(run?.details_url) || null,
    observedAt: new Date().toISOString(),
  };
  writeReceipt(outputPath, receipt);

  if (receipt.disposition === 'blocked') {
    throw new Error(`BLOCKED Supabase association truth: ${receipt.blockReason}. Evidence: ${outputPath}`);
  }

  return receipt;
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliInvocation()) {
  verifySupabaseCheckAssociation().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
