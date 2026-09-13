import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.github.com';
const DEFAULT_OUTPUT = 'artifacts/github-merge-membrane.json';
const DEFAULT_TIMEOUT_MS = 22 * 60 * 1000;
const DEFAULT_POLL_MS = 10_000;
const EXPECTED_APP = 'github-actions';

export const ALWAYS_REQUIRED_CHECKS = Object.freeze([
  'deploy',
  'repository-truth',
  'PR Continuity Exact-Head Gate',
  'Verify test-ledger contract',
]);

export const CONDITIONAL_CHECK_SCOPES = Object.freeze([
  {
    workflowPath: '.github/workflows/product-design-playwright-proof.yml',
    checkName: 'product-design-proof',
  },
  {
    workflowPath: '.github/workflows/founder-shield.yml',
    checkName: 'verify-founder-shield',
  },
]);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSha(value) {
  return clean(value).toLowerCase();
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeRegex(value) {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

export function globMatches(file, pattern) {
  const normalizedFile = clean(file).replace(/^\.\//, '');
  const normalizedPattern = clean(pattern).replace(/^\.\//, '');
  if (!normalizedFile || !normalizedPattern) return false;

  let regex = escapeRegex(normalizedPattern);
  regex = regex.replace(/\*\*/g, '<<<DOUBLE_STAR>>>');
  regex = regex.replace(/\*/g, '[^/]*');
  regex = regex.replace(/<<<DOUBLE_STAR>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(normalizedFile);
}

export function extractPullRequestPaths(workflowSource) {
  const lines = String(workflowSource ?? '').split(/\r?\n/u);
  const pullRequestIndex = lines.findIndex((line) => /^\s{2}pull_request:\s*$/u.test(line));
  if (pullRequestIndex === -1) return [];

  let pathsIndex = -1;
  for (let index = pullRequestIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s{2}[A-Za-z0-9_-]+:\s*$/u.test(line)) break;
    if (/^\s{4}paths:\s*$/u.test(line)) {
      pathsIndex = index;
      break;
    }
  }
  if (pathsIndex === -1) return [];

  const paths = [];
  for (let index = pathsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s{6}-\s+['"]?(.+?)['"]?\s*$/u);
    if (!match) break;
    paths.push(match[1]);
  }
  return paths;
}

export function expectedChecksForChangedFiles(changedFiles, scopePatterns) {
  const expected = new Set(ALWAYS_REQUIRED_CHECKS);
  const files = Array.isArray(changedFiles) ? changedFiles : [];

  for (const scope of CONDITIONAL_CHECK_SCOPES) {
    const patterns = scopePatterns?.[scope.workflowPath] ?? [];
    const scopeDefinitionChanged = files.includes(scope.workflowPath);
    const scopedFileChanged = patterns.some((pattern) => files.some((file) => globMatches(file, pattern)));
    if (scopeDefinitionChanged || scopedFileChanged) expected.add(scope.checkName);
  }

  return [...expected];
}

function timestamp(run) {
  const value = Date.parse(run?.created_at ?? run?.started_at ?? run?.completed_at ?? '');
  return Number.isFinite(value) ? value : 0;
}

function sequence(run) {
  const value = Number(run?.id);
  return Number.isFinite(value) ? value : 0;
}

export function selectLatestExactHeadChecks(checkRuns, expectedSha) {
  const exactSha = normalizeSha(expectedSha);
  const selected = new Map();

  for (const run of Array.isArray(checkRuns) ? checkRuns : []) {
    if (normalizeSha(run?.head_sha) !== exactSha) continue;
    const name = clean(run?.name);
    const app = clean(run?.app?.slug || run?.app?.name);
    if (!name || !app) continue;
    const key = `${app}\u0000${name}`;
    const current = selected.get(key);
    const runTimestamp = timestamp(run);
    const currentTimestamp = timestamp(current);
    if (
      !current
      || runTimestamp > currentTimestamp
      || (runTimestamp === currentTimestamp && sequence(run) > sequence(current))
    ) {
      selected.set(key, run);
    }
  }

  return [...selected.values()];
}

export function evaluateExpectedChecks({ expectedChecks, checkRuns, expectedSha }) {
  const exactChecks = selectLatestExactHeadChecks(checkRuns, expectedSha);
  const byName = new Map();
  for (const run of exactChecks) {
    const name = clean(run?.name);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(run);
  }

  const observed = [];
  for (const name of expectedChecks) {
    const candidates = byName.get(name) ?? [];
    const trusted = candidates.filter((run) => clean(run?.app?.slug || run?.app?.name) === EXPECTED_APP);
    const run = trusted.sort((left, right) => timestamp(right) - timestamp(left))[0] ?? null;

    if (!run) {
      observed.push({ name, app: EXPECTED_APP, state: 'missing', status: null, conclusion: null, id: null });
      continue;
    }

    const status = clean(run.status) || null;
    const conclusion = clean(run.conclusion) || null;
    let state = 'pending';
    if (status === 'completed') state = conclusion === 'success' ? 'passed' : 'failed';
    observed.push({ name, app: EXPECTED_APP, state, status, conclusion, id: String(run.id ?? '') || null });
  }

  const missing = observed.filter((item) => item.state === 'missing').map((item) => item.name);
  const pending = observed.filter((item) => item.state === 'pending').map((item) => item.name);
  const failed = observed.filter((item) => item.state === 'failed').map((item) => item.name);

  return {
    ready: missing.length === 0 && pending.length === 0 && failed.length === 0,
    terminalFailure: failed.length > 0,
    missing,
    pending,
    failed,
    observed,
  };
}

async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'sekret-bip-merge-membrane',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub read failed (${response.status}): ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

async function fetchAllPages(urlFactory, token) {
  const rows = [];
  for (let page = 1; page <= 10; page += 1) {
    const payload = await githubJson(urlFactory(page), token);
    const pageRows = Array.isArray(payload) ? payload : Array.isArray(payload?.check_runs) ? payload.check_runs : [];
    rows.push(...pageRows);
    if (pageRows.length < 100) break;
  }
  return rows;
}

async function fetchPullRequest({ repository, prNumber, token }) {
  const [owner, repo] = repository.split('/');
  return githubJson(`${API_BASE}/repos/${owner}/${repo}/pulls/${encodeURIComponent(prNumber)}`, token);
}

async function fetchChangedFiles({ repository, prNumber, token }) {
  const [owner, repo] = repository.split('/');
  return fetchAllPages(
    (page) => `${API_BASE}/repos/${owner}/${repo}/pulls/${encodeURIComponent(prNumber)}/files?per_page=100&page=${page}`,
    token,
  ).then((rows) => rows.map((row) => clean(row?.filename)).filter(Boolean));
}

async function fetchCheckRuns({ repository, sha, token }) {
  const [owner, repo] = repository.split('/');
  return fetchAllPages(
    (page) => `${API_BASE}/repos/${owner}/${repo}/commits/${sha}/check-runs?filter=all&per_page=100&page=${page}`,
    token,
  );
}

async function fetchTrustedWorkflowSource({ repository, workflowPath, baseSha, token }) {
  const [owner, repo] = repository.split('/');
  const encodedPath = workflowPath.split('/').map(encodeURIComponent).join('/');
  const payload = await githubJson(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(baseSha)}`,
    token,
  );
  if (payload?.type !== 'file' || clean(payload?.encoding) !== 'base64' || !clean(payload?.content)) {
    throw new Error(`Trusted workflow source is unavailable at ${workflowPath}@${baseSha}.`);
  }
  return Buffer.from(String(payload.content).replace(/\s+/g, ''), 'base64').toString('utf8');
}

async function loadTrustedScopePatterns({ repository, baseSha, token }) {
  const result = {};
  for (const scope of CONDITIONAL_CHECK_SCOPES) {
    const source = await fetchTrustedWorkflowSource({
      repository,
      workflowPath: scope.workflowPath,
      baseSha,
      token,
    });
    const paths = extractPullRequestPaths(source);
    if (paths.length === 0) throw new Error(`No trusted pull_request paths found in ${scope.workflowPath}@${baseSha}.`);
    result[scope.workflowPath] = paths;
  }
  return result;
}

async function writeReceipt(outputPath, receipt) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function verifyGithubMergeMembrane({ env = process.env, now = () => new Date() } = {}) {
  const repository = clean(env.GITHUB_REPOSITORY);
  const expectedSha = normalizeSha(env.EXPECTED_HEAD_SHA || env.GITHUB_SHA);
  const trustedBaseSha = normalizeSha(env.TRUSTED_BASE_SHA);
  const prNumber = clean(env.PR_NUMBER || env.GITHUB_PR_NUMBER);
  const token = clean(env.GITHUB_TOKEN);
  const requestedOutputPath = clean(env.MERGE_MEMBRANE_EVIDENCE_PATH);
  const outputPath = DEFAULT_OUTPUT;
  const timeoutMs = Number(env.MERGE_MEMBRANE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const pollMs = Number(env.MERGE_MEMBRANE_POLL_MS || DEFAULT_POLL_MS);

  if (!repository || !expectedSha || !trustedBaseSha || !prNumber || !token) {
    throw new Error('GITHUB_REPOSITORY, EXPECTED_HEAD_SHA/GITHUB_SHA, TRUSTED_BASE_SHA, PR_NUMBER, and GITHUB_TOKEN are required.');
  }
  if (requestedOutputPath && requestedOutputPath !== DEFAULT_OUTPUT) {
    throw new Error(`MERGE_MEMBRANE_EVIDENCE_PATH must be ${DEFAULT_OUTPUT}.`);
  }

  const pullRequest = await fetchPullRequest({ repository, prNumber, token });
  const observedHeadSha = normalizeSha(pullRequest?.head?.sha);
  const observedBaseSha = normalizeSha(pullRequest?.base?.sha);
  const baseRef = clean(pullRequest?.base?.ref);
  if (observedHeadSha !== expectedSha) {
    throw new Error(`PR_HEAD_SHA_MISMATCH expected=${expectedSha} observed=${observedHeadSha || 'missing'}`);
  }
  if (baseRef !== 'main' || !observedBaseSha) {
    throw new Error(`TRUSTED_BASE_INVALID ref=${baseRef || 'missing'} sha=${observedBaseSha || 'missing'}`);
  }
  if (observedBaseSha !== trustedBaseSha) {
    throw new Error(`TRUSTED_BASE_SHA_MISMATCH expected=${trustedBaseSha} observed=${observedBaseSha}`);
  }

  const changedFiles = await fetchChangedFiles({ repository, prNumber, token });
  const scopePatterns = await loadTrustedScopePatterns({ repository, baseSha: trustedBaseSha, token });
  const expectedChecks = expectedChecksForChangedFiles(changedFiles, scopePatterns);
  const startedAt = Date.now();
  let evaluation = null;

  while (Date.now() - startedAt < timeoutMs) {
    const checkRuns = await fetchCheckRuns({ repository, sha: expectedSha, token });
    evaluation = evaluateExpectedChecks({ expectedChecks, checkRuns, expectedSha });

    const receipt = {
      schemaVersion: 3,
      generatedAt: now().toISOString(),
      repository,
      pullRequest: Number(prNumber),
      exactHead: expectedSha,
      trustedBase: trustedBaseSha,
      scopeAuthority: 'trusted-pr-base',
      mutationPerformed: false,
      authority: 'merge-membrane-observation',
      expectedChecks,
      ...evaluation,
    };
    await writeReceipt(outputPath, receipt);

    if (evaluation.ready) {
      console.log(`GITHUB_MERGE_MEMBRANE_VERIFIED head=${expectedSha} base=${trustedBaseSha} checks=${expectedChecks.length}`);
      return receipt;
    }
    if (evaluation.terminalFailure) {
      throw new Error(`GITHUB_MERGE_MEMBRANE_FAILED: ${evaluation.failed.join(', ')}`);
    }

    await sleep(pollMs);
  }

  throw new Error(
    `GITHUB_MERGE_MEMBRANE_TIMEOUT missing=${evaluation?.missing?.join(',') || 'none'} pending=${evaluation?.pending?.join(',') || 'none'}`,
  );
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  verifyGithubMergeMembrane().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
