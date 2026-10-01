import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.github.com';
const OUTPUT_PATH = 'artifacts/cloudflare-credential-cutover-authority.json';
const RECEIPT_ROOT = '.github/credential-migrations';
const SECRET_REFERENCE = /secrets(?:\.(CLOUDFLARE_[A-Z0-9_]+)|\[['"](CLOUDFLARE_[A-Z0-9_]+)['"]\])/g;

export const PROVIDER_WORKFLOW_BY_SECRET = Object.freeze({
  CLOUDFLARE_ACCESS_API_TOKEN: '.github/workflows/audit-cloudflare-zone-access-coverage.yml',
  CLOUDFLARE_APP_BINDING_READ_API_TOKEN: '.github/workflows/audit-cloudflare-zone-access-coverage.yml',
  CLOUDFLARE_PAGES_READ_API_TOKEN: '.github/workflows/cloudflare-branch-authority.yml',
  CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: '.github/workflows/cloudflare-branch-authority.yml',
});

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSha(value) {
  return clean(value).toLowerCase();
}

function positiveRunId(value) {
  const runId = Number(value);
  return Number.isSafeInteger(runId) && runId > 0 ? runId : null;
}

export function extractCloudflareSecrets(source) {
  const secrets = new Set();
  for (const match of String(source ?? '').matchAll(SECRET_REFERENCE)) {
    secrets.add(match[1] ?? match[2]);
  }
  return secrets;
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function receiptPath(secret) {
  return `${RECEIPT_ROOT}/${secret}.json`;
}

async function githubResponse(url, token) {
  return fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'sekret-bip-cloudflare-credential-cutover-authority',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

async function githubJson(url, token) {
  const response = await githubResponse(url, token);
  const text = await response.text();
  if (!response.ok) throw new Error(`GITHUB_READ_FAILED status=${response.status}`);
  return JSON.parse(text);
}

async function githubJsonOrNull(url, token) {
  const response = await githubResponse(url, token);
  const text = await response.text();
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GITHUB_READ_FAILED status=${response.status}`);
  return JSON.parse(text);
}

async function fetchAllPages(urlFactory, token) {
  const rows = [];
  for (let page = 1; page <= 10; page += 1) {
    const payload = await githubJson(urlFactory(page), token);
    const pageRows = Array.isArray(payload) ? payload : [];
    rows.push(...pageRows);
    if (pageRows.length < 100) break;
  }
  return rows;
}

async function fetchChangedFiles({ owner, repo, prNumber, token }) {
  return fetchAllPages(
    (page) => `${API_BASE}/repos/${owner}/${repo}/pulls/${encodeURIComponent(prNumber)}/files?per_page=100&page=${page}`,
    token,
  ).then((rows) => rows.map((row) => ({
    path: clean(row?.filename),
    previousPath: clean(row?.previous_filename) || null,
    status: clean(row?.status),
  })).filter((row) => Boolean(row.path)));
}

async function fetchFileText({ owner, repo, ref, filePath, token }) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const payload = await githubJsonOrNull(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    token,
  );
  if (!payload) return null;
  if (payload?.type !== 'file' || clean(payload?.encoding) !== 'base64' || !clean(payload?.content)) {
    throw new Error('GITHUB_FILE_CONTENT_UNAVAILABLE');
  }
  return Buffer.from(String(payload.content).replace(/\s+/g, ''), 'base64').toString('utf8');
}

async function fetchReceipt({ owner, repo, headSha, secret, token }) {
  const source = await fetchFileText({
    owner,
    repo,
    ref: headSha,
    filePath: receiptPath(secret),
    token,
  });
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    throw new Error('CREDENTIAL_CUTOVER_RECEIPT_JSON_INVALID');
  }
}

export function evaluateProviderRun({ run, expectedBaseSha, expectedWorkflowPath }) {
  const observedPath = clean(run?.path);
  const observedSha = normalizeSha(run?.head_sha);
  const observedBranch = clean(run?.head_branch);
  const event = clean(run?.event);
  const status = clean(run?.status);
  const conclusion = clean(run?.conclusion);
  const repository = clean(run?.repository?.full_name);
  const headRepository = clean(run?.head_repository?.full_name);

  const failures = [];
  if (observedPath !== expectedWorkflowPath) failures.push('workflow-path');
  if (observedSha !== normalizeSha(expectedBaseSha)) failures.push('exact-base-sha');
  if (observedBranch !== 'main') failures.push('main-branch');
  if (!['push', 'workflow_dispatch'].includes(event)) failures.push('trusted-event');
  if (status !== 'completed') failures.push('completed');
  if (conclusion !== 'success') failures.push('success');
  if (!repository || (headRepository && headRepository !== repository)) failures.push('same-repository');

  return {
    verified: failures.length === 0,
    failures,
    observed: {
      id: positiveRunId(run?.id),
      workflowPath: observedPath || null,
      headSha: observedSha || null,
      headBranch: observedBranch || null,
      event: event || null,
      status: status || null,
      conclusion: conclusion || null,
    },
  };
}

export function validateCutoverReceipt(receipt, secret) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return { verified: false, runId: null, reason: 'receipt-missing' };
  }
  if (receipt.schema !== 'juss/cloudflare-credential-migration@v1') {
    return { verified: false, runId: null, reason: 'schema' };
  }
  if (receipt.newSecret !== secret || receipt.phase !== 'cutover') {
    return { verified: false, runId: null, reason: 'cutover-shape' };
  }
  const evidenceKeys = Object.keys(receipt.providerEvidence ?? {});
  if (evidenceKeys.length !== 1 || evidenceKeys[0] !== 'runId') {
    return { verified: false, runId: null, reason: 'provider-evidence-shape' };
  }
  const runId = positiveRunId(receipt.providerEvidence?.runId);
  if (!runId) return { verified: false, runId: null, reason: 'run-id' };
  return { verified: true, runId, reason: null };
}

async function writeReceipt(receipt) {
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

export async function verifyCloudflareCredentialCutoverAuthority({ env = process.env } = {}) {
  const repository = clean(env.GITHUB_REPOSITORY);
  const expectedHeadSha = normalizeSha(env.EXPECTED_HEAD_SHA);
  const trustedBaseSha = normalizeSha(env.TRUSTED_BASE_SHA);
  const prNumber = clean(env.PR_NUMBER);
  const token = clean(env.GITHUB_TOKEN);

  if (!repository || !expectedHeadSha || !trustedBaseSha || !prNumber || !token) {
    throw new Error('GITHUB_REPOSITORY, EXPECTED_HEAD_SHA, TRUSTED_BASE_SHA, PR_NUMBER, and GITHUB_TOKEN are required.');
  }
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPOSITORY_INVALID');

  const pullRequest = await githubJson(`${API_BASE}/repos/${owner}/${repo}/pulls/${encodeURIComponent(prNumber)}`, token);
  if (normalizeSha(pullRequest?.head?.sha) !== expectedHeadSha) throw new Error('CREDENTIAL_CUTOVER_PR_HEAD_MISMATCH');
  if (clean(pullRequest?.base?.ref) !== 'main' || normalizeSha(pullRequest?.base?.sha) !== trustedBaseSha) {
    throw new Error('CREDENTIAL_CUTOVER_TRUSTED_BASE_MISMATCH');
  }

  const changedFiles = await fetchChangedFiles({ owner, repo, prNumber, token });
  const workflowChanges = changedFiles.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/u.test(file.path));
  const requiredProofs = [];

  for (const change of workflowChanges) {
    if (change.status === 'removed') continue;
    const basePath = change.status === 'renamed' && change.previousPath ? change.previousPath : change.path;
    const [baseSource, headSource] = await Promise.all([
      change.status === 'added'
        ? Promise.resolve(null)
        : fetchFileText({ owner, repo, ref: trustedBaseSha, filePath: basePath, token }),
      fetchFileText({ owner, repo, ref: expectedHeadSha, filePath: change.path, token }),
    ]);
    if (headSource === null) continue;

    const baseSecrets = extractCloudflareSecrets(baseSource);
    const headSecrets = extractCloudflareSecrets(headSource);
    const added = difference(headSecrets, baseSecrets);
    const removed = difference(baseSecrets, headSecrets);

    for (const newSecret of added) {
      const receipt = await fetchReceipt({ owner, repo, headSha: expectedHeadSha, secret: newSecret, token });
      if (receipt?.phase === 'cutover') requiredProofs.push({ workflowPath: change.path, newSecret, previousSecret: null, receipt });
    }

    for (const previousSecret of removed) {
      const candidates = [];
      for (const newSecret of headSecrets) {
        const receipt = await fetchReceipt({ owner, repo, headSha: expectedHeadSha, secret: newSecret, token });
        if (
          receipt?.phase === 'cutover'
          && receipt?.newSecret === newSecret
          && Array.isArray(receipt?.previousSecrets)
          && receipt.previousSecrets.includes(previousSecret)
        ) {
          candidates.push({ workflowPath: change.path, newSecret, previousSecret, receipt });
        }
      }
      if (candidates.length !== 1) throw new Error('CREDENTIAL_CUTOVER_RECEIPT_CARDINALITY_INVALID');
      requiredProofs.push(candidates[0]);
    }
  }

  const deduped = new Map();
  for (const proof of requiredProofs) {
    deduped.set(`${proof.workflowPath}\u0000${proof.newSecret}\u0000${proof.previousSecret ?? ''}`, proof);
  }

  const proofs = [];
  for (const proof of deduped.values()) {
    const expectedWorkflowPath = PROVIDER_WORKFLOW_BY_SECRET[proof.newSecret];
    if (!expectedWorkflowPath) throw new Error('CREDENTIAL_CUTOVER_PROVIDER_WORKFLOW_UNMAPPED');

    const receiptVerdict = validateCutoverReceipt(proof.receipt, proof.newSecret);
    if (!receiptVerdict.verified) throw new Error(`CREDENTIAL_CUTOVER_RECEIPT_INVALID:${receiptVerdict.reason}`);

    const run = await githubJson(`${API_BASE}/repos/${owner}/${repo}/actions/runs/${receiptVerdict.runId}`, token);
    const runVerdict = evaluateProviderRun({
      run,
      expectedBaseSha: trustedBaseSha,
      expectedWorkflowPath,
    });
    if (!runVerdict.verified) throw new Error(`CREDENTIAL_CUTOVER_PROVIDER_RUN_INVALID:${runVerdict.failures.join(',')}`);

    proofs.push({
      workflowPath: proof.workflowPath,
      newSecret: proof.newSecret,
      previousSecret: proof.previousSecret,
      providerWorkflowPath: expectedWorkflowPath,
      runId: receiptVerdict.runId,
      exactBaseSha: trustedBaseSha,
    });
  }

  const receipt = {
    schemaVersion: 1,
    repository,
    pullRequest: Number(prNumber),
    exactHead: expectedHeadSha,
    trustedBase: trustedBaseSha,
    authority: 'trusted-base-github-provider-run-readback',
    mutationPerformed: false,
    required: proofs.length > 0,
    verified: true,
    proofs,
  };
  await writeReceipt(receipt);
  console.log(`CLOUDFLARE_CREDENTIAL_CUTOVER_AUTHORITY_VERIFIED proofs=${proofs.length}`);
  return receipt;
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  verifyCloudflareCredentialCutoverAuthority().catch(async (error) => {
    await writeReceipt({
      schemaVersion: 1,
      authority: 'trusted-base-github-provider-run-readback',
      mutationPerformed: false,
      verified: false,
      failure: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
