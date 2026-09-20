import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import failureIdentity from '../scripts/control-room-failure-identity.cjs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const scanner = read('scripts/control-room-ingest-github-failures.mjs');
const localIngest = read('scripts/control-room-ingest-local-report.mjs');
const localRunner = read('scripts/control-room-local.js');
const docs = read('docs/CONTROL_ROOM_GITHUB_FAILURES.md');
const ci = read('.github/workflows/ci.yml');
const watcher = read('.github/workflows/control-room-github-failures.yml');
const exactGate = read('.github/workflows/github-failure-routing-exact-head.yml');
const packageJson = JSON.parse(read('package.json'));
const { buildFailureIdentity, canonicalFailureKey } = failureIdentity;

test('GitHub failures and skipped proof witnesses route through Founder Control Room first', () => {
  assert.match(scanner, /Founder Control Room is the first escalation surface whenever GitHub fails/);
  assert.match(scanner, /upsert_control_room_issue/);
  assert.match(scanner, /audit_events/);
  assert.match(docs, /Every GitHub failure/);
  assert.match(docs, /every skipped proof witness/i);
  assert.match(docs, /must be checked against Founder Control Room first/);
});

test('clean local and GitHub evidence converge on one source-neutral incident fingerprint', () => {
  const repository = 'jussray/Sekret-Bip';
  const headSha = 'a'.repeat(40);
  const local = buildFailureIdentity({
    repository,
    headSha,
    failureKey: canonicalFailureKey('unit-tests'),
    correlatable: true,
    source: 'local_control_room',
    evidence: { command: 'npm test', exit_code: 1 },
  });
  const github = buildFailureIdentity({
    repository,
    headSha,
    failureKey: canonicalFailureKey('Run npm test'),
    correlatable: true,
    source: 'github_actions',
    evidence: { workflow_id: 1, run_id: 2, job_id: 3, step_number: 4, conclusion: 'failure' },
  });

  assert.equal(local.failure_key, 'unit-tests');
  assert.equal(github.failure_key, 'unit-tests');
  assert.equal(local.incident_fingerprint, github.incident_fingerprint);
  assert.notEqual(local.proof_cookie, github.proof_cookie);
  for (const receipt of [local, github]) {
    assert.equal(receipt.authority, false);
    assert.equal(receipt.merge_authority, false);
    assert.equal(receipt.proof_satisfied, false);
    assert.equal(receipt.browser_cookie, false);
    assert.equal(receipt.authorizing, false);
  }
});

test('real CI command names map only to their existing local verification identities', () => {
  assert.equal(canonicalFailureKey('Run npm test'), 'unit-tests');
  assert.equal(canonicalFailureKey('Run npm run type-check'), 'type-check');
  assert.equal(canonicalFailureKey('Run npm run lint'), 'lint');
  assert.equal(canonicalFailureKey('Run npm run test:oracle'), 'oracle');
  assert.equal(canonicalFailureKey('Run npm run test:voice-intelligence'), 'voice-intelligence');
  assert.equal(canonicalFailureKey('Run npm run audit:runtime-assets'), 'runtime-assets');
  assert.equal(canonicalFailureKey('Run npm run verify:room-archives'), 'room-archives');
  assert.equal(canonicalFailureKey('Export Expo web bundle'), 'export-expo-web-bundle');
});

test('dirty local work cannot impersonate exact-head GitHub evidence', () => {
  const common = {
    repository: 'jussray/Sekret-Bip',
    headSha: 'b'.repeat(40),
    failureKey: canonicalFailureKey('TypeScript'),
  };
  const dirtyLocal = buildFailureIdentity({
    ...common,
    correlatable: false,
    source: 'local_control_room',
    evidence: { worktree: 'dirty', command: 'npm run type-check' },
  });
  const github = buildFailureIdentity({
    ...common,
    correlatable: true,
    source: 'github_actions',
    evidence: { run_id: 9, step_number: 2 },
  });

  assert.equal(dirtyLocal.failure_key, 'type-check');
  assert.equal(dirtyLocal.correlatable, false);
  assert.notEqual(dirtyLocal.incident_fingerprint, github.incident_fingerprint);
});

test('incident identity expires when exact head changes', () => {
  const base = {
    repository: 'jussray/Sekret-Bip',
    failureKey: canonicalFailureKey('Lint'),
    correlatable: true,
    source: 'github_actions',
    evidence: { run_id: 7 },
  };
  const first = buildFailureIdentity({ ...base, headSha: '1'.repeat(40) });
  const second = buildFailureIdentity({ ...base, headSha: '2'.repeat(40) });
  assert.notEqual(first.incident_fingerprint, second.incident_fingerprint);
});

test('runner-startup failures are not mislabeled as code regressions', () => {
  assert.match(scanner, /runner_startup_failure/);
  assert.match(scanner, /workflow_no_jobs/);
  assert.match(scanner, /workflow_step_failure/);
  assert.match(scanner, /const failedJobs = jobs\.filter/);
  assert.match(scanner, /const evidenceJobs = failedJobs\.length > 0 \? failedJobs : jobs/);
  assert.match(scanner, /A run with no executed steps or logs is infrastructure evidence, not proof of a code regression/);
  assert.match(scanner, /do not change application code until a real failing step or log exists/);
  assert.match(docs, /This is infrastructure evidence\. It is not proof of a code regression/);
});

test('GitHub failure reports retain exact PR, branch, head, workflow, run, and per-step proof evidence', () => {
  for (const field of [
    'pr_number',
    'pr_url',
    'head_ref',
    'head_sha',
    'workflow_name',
    'run_id',
    'run_url',
    'event',
    'failure_class',
    'jobs',
  ]) {
    assert.match(scanner, new RegExp(field));
  }
  assert.match(scanner, /github-failures-latest\.json/);
  assert.match(scanner, /requested_run_id/);
  assert.match(scanner, /main_push_failure_count/);
  assert.match(scanner, /failureReceipts/);
  assert.match(scanner, /receipt_count/);
  assert.match(scanner, /incident_fingerprint/);
  assert.match(scanner, /proof_cookie/);
});

test('local verification binds failures to git identity and refuses dirty-worktree correlation', () => {
  assert.match(localRunner, /gitIdentity/);
  assert.match(localRunner, /rev-parse/);
  assert.match(localRunner, /status.*--porcelain/);
  assert.match(localRunner, /correlatable/);
  assert.match(localRunner, /redactOutput/);
  assert.match(localIngest, /buildFailureIdentity/);
  assert.match(localIngest, /incident_fingerprint/);
  assert.match(localIngest, /proof_cookie/);
  assert.doesNotMatch(localIngest, /stdout_tail/);
  assert.doesNotMatch(localIngest, /stderr_tail/);
});

test('scanner supports exact current runs and completed main push failures', () => {
  assert.match(scanner, /CONTROL_ROOM_GITHUB_RUN_ID/);
  assert.match(scanner, /\/actions\/runs\/\$\{runId\}/);
  assert.match(scanner, /event=push&branch=/);
  assert.match(scanner, /collectMainPushFailures/);
  assert.match(scanner, /run\.event === 'push'/);
});

test('CI and major workflow failures invoke the scanner automatically without recursion', () => {
  assert.match(ci, /route-failure:/);
  assert.match(ci, /needs: \[lint, type-check, test, build, audit\]/);
  assert.match(ci, /CONTROL_ROOM_GITHUB_RUN_ID: \$\{\{ github\.run_id \}\}/);
  assert.match(ci, /node scripts\/control-room-ingest-github-failures\.mjs/);
  assert.match(ci, /reports\/control-room\/github-failures-latest\.json/);
  assert.match(watcher, /workflow_run:/);
  assert.match(watcher, /Quality Gate/);
  assert.match(watcher, /Type Check/);
  assert.match(watcher, /Implementation Evidence/);
  assert.match(watcher, /Playwright Smoke and Guardrails/);
  assert.match(watcher, /github\.event\.workflow_run\.id/);

  const watchedWorkflowBlock = watcher.match(/workflows:\s*([\s\S]*?)\n\s*types:/)?.[1] || '';
  assert.doesNotMatch(watchedWorkflowBlock, /Founder Control Room GitHub Failure Router/);
  assert.doesNotMatch(watchedWorkflowBlock, /GitHub Failure Routing Exact-Head Gate/);
  assert.match(exactGate, /select\(\.name != "GitHub Failure Routing Exact-Head Gate"\)/);
});

test('credentials stay server-side and out of issue metadata', () => {
  assert.match(scanner, /process\.env\.GH_TOKEN \|\| process\.env\.GITHUB_TOKEN/);
  assert.match(scanner, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(scanner, /EXPO_PUBLIC_GITHUB/);
  assert.doesNotMatch(scanner, /githubToken[,}]/);
  assert.doesNotMatch(scanner, /serviceRoleKey[,}]/);
  assert.match(scanner, /credentials are read only from server-side environment variables and are never written to reports or issue metadata/);
  assert.match(docs, /Tokens and keys must never enter React Native, Expo public variables, reports, audit metadata, PR comments, or committed files/);
});

test('scan and ingest commands are explicitly exposed', () => {
  assert.equal(
    packageJson.scripts['control-room:github-failures:scan'],
    'node scripts/control-room-ingest-github-failures.mjs',
  );
  assert.equal(
    packageJson.scripts['control-room:github-failures:ingest'],
    'CONTROL_ROOM_GITHUB_INGEST=1 node scripts/control-room-ingest-github-failures.mjs',
  );
  assert.equal(
    packageJson.scripts['test:github-failure-routing'],
    'node --test test/control-room-github-failure-routing.test.mjs',
  );
});
