import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = fs.readFileSync(
  path.join(repositoryRoot, '.github/workflows/production-smoke.yml'),
  'utf8',
);

test('Production Smoke runs live Playwright only after verified current production deployment evidence', () => {
  assert.match(content, /workflows: \["Verify Cloudflare Native Deployment"\]/);
  assert.doesNotMatch(content, /\bpull_request:/);
  assert.doesNotMatch(content, /\bworkflow_dispatch:/);
  assert.match(content, /actions: read/);
  assert.match(
    content,
    /EXPECTED_HEAD_SHA: \$\{\{ github\.sha \}\}/,
  );
  assert.match(
    content,
    /EXPECTED_RELEASE_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/,
  );
  assert.match(
    content,
    /WORKFLOW_HEAD_SHA: \$\{\{ github\.sha \}\}/,
  );
  assert.doesNotMatch(content, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.doesNotMatch(content, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(content, /github\.event\.workflow_run\.head_branch == 'main'/);
  assert.match(content, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(content, /group: production-smoke-main/);
  assert.match(content, /cancel-in-progress: true/);
  assert.match(content, /Classify upstream production verification and current target/);
  assert.doesNotMatch(content, /github\.event_name == 'workflow_dispatch'/);
  assert.match(content, /actions\/runs\/\$UPSTREAM_RUN_ID\/jobs\?per_page=100/);
  assert.match(content, /Verify exact frontend Worker, backend Worker, and release/);
  assert.match(content, /if \(!target\) \{/);
  assert.match(content, /Required upstream production verification job is absent/);
  assert.match(content, /target\.conclusion === "skipped"/);
  assert.doesNotMatch(content, /!target \|\| target\.conclusion === "skipped"/);
  assert.match(content, /should_run=\$\{value\}/);
  assert.match(content, /target\.status !== "completed"/);
  assert.match(content, /target\.conclusion !== "success"/);
  assert.match(content, /target\.head_sha !== process\.env\.UPSTREAM_HEAD_SHA/);
  assert.match(content, /does not belong to the release SHA/);
  assert.match(content, /UPSTREAM_HEAD_SHA !== process\.env\.WORKFLOW_HEAD_SHA/);
  assert.match(content, /WORKFLOW_HEAD_SHA !== process\.env\.CURRENT_MAIN/);
  assert.match(content, /steps\.upstream\.outputs\.should_run == 'true'/);
  assert.match(content, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  assert.match(content, /persist-credentials: false/);
  assert.match(content, /actual="\$\(git rev-parse HEAD\)"/);
  assert.match(content, /test "\$actual" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(content, /test "\$EXPECTED_HEAD_SHA" = "\$EXPECTED_RELEASE_SHA"/);
  assert.match(content, /Reverify exact live release identities after smoke/);
  assert.match(
    content,
    /--grep "production exposes the exact expected Pages and Worker release commit"/,
  );
  assert.match(content, /Verify smoke target remained current main/);
  assert.match(content, /test "\$current_main" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(content, /\.\/node_modules\/\.bin\/playwright install --with-deps chromium/);
  assert.match(content, /\.\/node_modules\/\.bin\/playwright test --config=playwright\.production\.config\.ts/);
  assert.match(content, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(content, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(content, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.doesNotMatch(content, /workflows: \["Deploy to Cloudflare"\]/);
  assert.doesNotMatch(content, /npm install --no-save --no-package-lock @playwright\/test/);
  assert.doesNotMatch(content, /\bnpx playwright\b/);
});
