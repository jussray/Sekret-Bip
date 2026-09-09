import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const scanner = read('scripts/control-room-ingest-github-failures.mjs');
const docs = read('docs/CONTROL_ROOM_GITHUB_FAILURES.md');
const ci = read('.github/workflows/ci.yml');
const watcher = read('.github/workflows/control-room-github-failures.yml');
const exactGate = read('.github/workflows/github-failure-routing-exact-head.yml');
const packageJson = JSON.parse(read('package.json'));

test('GitHub failures route through Founder Control Room first', () => {
  assert.match(scanner, /Founder Control Room is the first escalation surface whenever GitHub fails/);
  assert.match(scanner, /github_actions_/);
  assert.match(scanner, /upsert_control_room_issue/);
  assert.match(scanner, /audit_events/);
  assert.match(docs, /Every GitHub failure must be checked against Founder Control Room first/);
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

test('GitHub failure reports retain exact PR, branch, head, workflow, and run evidence', () => {
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
  assert.match(scanner, /scopeKey\(item\)/);
  assert.match(scanner, /requested_run_id/);
  assert.match(scanner, /main_push_failure_count/);
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