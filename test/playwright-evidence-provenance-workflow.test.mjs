import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync('.github/workflows/playwright.yml', 'utf8');

test('manual Playwright proof requires an explicit exact candidate SHA', () => {
  assert.match(workflow, /target_sha:\n\s+description: Exact candidate commit SHA to verify\n\s+required: true/);
  assert.match(workflow, /EXPECTED_HEAD_SHA: \$\{\{ inputs\.target_sha \}\}/);
  assert.match(workflow, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  assert.match(workflow, /test "\$actual" = "\$EXPECTED_HEAD_SHA"/);
});

test('browser evidence emits a run-bound provenance receipt without granting authority', () => {
  for (const field of [
    'commitSha: sha',
    'generatedAt: new Date().toISOString()',
    'workflow: clean(process.env.EVIDENCE_WORKFLOW)',
    'id: clean(process.env.EVIDENCE_RUN_ID)',
    'attempt: clean(process.env.EVIDENCE_RUN_ATTEMPT)',
    'node: clean(process.env.EVIDENCE_NODE_VERSION)',
    'playwright: clean(process.env.EVIDENCE_PLAYWRIGHT_VERSION)',
    'merge: false',
    'deploy: false',
    'providerMutation: false',
  ]) {
    assert.ok(workflow.includes(field), `missing provenance field: ${field}`);
  }
  assert.match(workflow, /playwright-provenance-\$\{\{ env\.EXPECTED_HEAD_SHA \}\}-\$\{\{ github\.run_id \}\}/);
});

test('screenshots traces and video remain failure-scoped while provenance is always retained', () => {
  assert.match(workflow, /tracePolicy: 'retain-on-failure'/);
  assert.match(workflow, /screenshotPolicy: 'only-on-failure'/);
  assert.match(workflow, /videoPolicy: 'retain-on-failure'/);
  assert.match(workflow, /- name: Upload browser-evidence provenance\n\s+if: always\(\)/);
  assert.match(workflow, /- name: Upload failure-scoped Playwright evidence\n\s+if: failure\(\)/);
});

test('Playwright workflow uses pinned checkout setup-node and artifact actions', () => {
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
});
