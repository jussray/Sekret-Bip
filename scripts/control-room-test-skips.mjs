import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TEST_SKIP_MARKER = 'CONTROL_ROOM_TEST_SKIP_RECEIPT ';
export const TEST_SKIP_SCHEMA = 'juss/test-skip-observation@v1';
export const PROOF_COOKIE_SCHEMA = 'juss/proof-cookie@v1';

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clean(value, max = 600) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*\S+/gi, '<redacted-secret>')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '<redacted-email>')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,})\b/g, '<redacted-token>')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizedCommand(value) {
  return clean(value || process.env.CONTROL_ROOM_TEST_COMMAND || process.env.npm_lifecycle_event || 'unknown-command', 300);
}

export function resolveHeadSha({ env = process.env, root = process.cwd() } = {}) {
  const candidate = [env.CONTROL_ROOM_GITHUB_HEAD_SHA, env.EXPECTED_HEAD_SHA, env.GITHUB_SHA]
    .map((value) => String(value || '').trim().toLowerCase())
    .find((value) => /^[0-9a-f]{40}$/.test(value));
  if (candidate) return candidate;
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim().toLowerCase();
    return /^[0-9a-f]{40}$/.test(sha) ? sha : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function classifySkipReason(reason, explicitClass = null) {
  if (explicitClass) return clean(explicitClass, 80);
  const value = clean(reason, 600).toLowerCase();
  if (/missing|required|not set|credentials?|environment|\benv\b/.test(value)) return 'missing_prerequisite';
  if (/phase|inapplicable|intentionally|supersed|stale|not enabled|set [a-z0-9_]+|authority/.test(value)) {
    return 'gated_or_inapplicable';
  }
  return 'explicit_skip';
}

export function buildSkipObservation({
  repository = process.env.GITHUB_REPOSITORY || 'jussray/Sekret-Bip',
  headSha = resolveHeadSha(),
  runner = 'unknown',
  command = null,
  testId,
  testFile = null,
  reason = 'No skip reason supplied.',
  classification = null,
  surface = 'local',
  workflow = null,
  runId = null,
  job = null,
} = {}) {
  const core = {
    schema: TEST_SKIP_SCHEMA,
    repository: clean(repository, 160),
    head_sha: clean(headSha, 64).toLowerCase(),
    runner: clean(runner, 80),
    command: normalizedCommand(command),
    test_id: clean(testId || 'unknown-test', 500),
    test_file: testFile ? clean(testFile, 500) : null,
    reason: clean(reason || 'No skip reason supplied.', 600),
    classification: classifySkipReason(reason, classification),
    outcome: 'skipped',
    surface: clean(surface, 80),
    workflow: workflow ? clean(workflow, 200) : null,
    run_id: runId == null ? null : clean(runId, 80),
    job: job ? clean(job, 200) : null,
  };
  const identity = JSON.stringify([
    core.schema,
    core.repository,
    core.head_sha,
    core.runner,
    core.command,
    core.test_id,
    core.test_file,
    core.reason,
    core.classification,
  ]);
  const fingerprint = `test_skip:${hash(identity)}`;
  const proofCookie = `${PROOF_COOKIE_SCHEMA}:${hash(JSON.stringify([fingerprint, core.surface, core.outcome]))}`;
  return {
    ...core,
    fingerprint,
    proof_cookie: proofCookie,
    authority: false,
    merge_authority: false,
    proof_satisfied: false,
    investigation_required: true,
    blocks_claimed_proof: true,
  };
}

export function emitSkipObservation(observation, log = console.log) {
  log(`${TEST_SKIP_MARKER}${JSON.stringify(observation)}`);
}

export function parseSkipMarker(line, trusted = {}) {
  const index = String(line || '').indexOf(TEST_SKIP_MARKER);
  if (index < 0) return null;
  try {
    const parsed = JSON.parse(String(line).slice(index + TEST_SKIP_MARKER.length).trim());
    return buildSkipObservation({
      repository: trusted.repository || parsed.repository,
      headSha: trusted.headSha || parsed.head_sha,
      runner: parsed.runner,
      command: parsed.command,
      testId: parsed.test_id,
      testFile: parsed.test_file,
      reason: parsed.reason,
      classification: parsed.classification,
      surface: trusted.surface || parsed.surface,
      workflow: trusted.workflow || parsed.workflow,
      runId: trusted.runId ?? parsed.run_id,
      job: trusted.job || parsed.job,
    });
  } catch {
    return null;
  }
}

export function parseNodeTapSkip(line) {
  const match = String(line || '').match(/^\s*ok\s+\d+\s+-\s+(.+?)\s+#\s+SKIP(?:\s+(.*))?\s*$/i);
  if (!match) return null;
  return { testId: clean(match[1], 500), reason: clean(match[2] || 'Node test marked skipped.', 600) };
}

export function writeSkipReport(observations, {
  root = process.cwd(),
  filename = 'test-skips-latest.json',
  source = 'local_test_runner',
  extra = {},
} = {}) {
  const reportDir = path.join(root, 'reports', 'control-room');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, filename);
  const unique = [...new Map((observations || []).map((item) => [item.fingerprint, item])).values()];
  const report = {
    schema: 'juss/test-skip-report@v1',
    generated_at: new Date().toISOString(),
    source,
    skip_count: unique.length,
    observations: unique,
    guardrails: [
      'A skip is observable evidence, not a pass and not automatically a code failure.',
      'Fingerprints and proof cookies preserve continuity only; authority remains false.',
      'A skipped required witness cannot satisfy merge, deployment, or runtime proof.',
    ],
    ...extra,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { report, reportPath };
}
