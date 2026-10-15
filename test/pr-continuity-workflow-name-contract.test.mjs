import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audit = readFileSync('.github/workflows/pr-continuity.yml', 'utf8');
const metadata = readFileSync('.github/workflows/pr-continuity-metadata.yml', 'utf8');
const rollover = readFileSync('.github/workflows/pr-continuity-rollover.yml', 'utf8');

test('PR continuity jobs run only on their matching events without skipped placeholders', () => {
  assert.match(audit, /pull_request:\s*\n/);
  assert.doesNotMatch(audit, /pull_request_target:\s*\n|workflow_dispatch:\s*\n|\n  metadata-receipt:|\n  rollover:/);
  assert.match(audit, /^    name: PR Continuity Exact-Head Gate$/m);
  assert.doesNotMatch(audit, /\n    if:/);

  assert.match(metadata, /pull_request_target:\s*\n/);
  assert.doesNotMatch(metadata, /\n  pull_request:\s*\n|workflow_dispatch:\s*\n|\n  exact-head-audit:|\n  rollover:/);
  assert.match(metadata, /^    name: PR Continuity Metadata Receipt$/m);
  assert.doesNotMatch(metadata, /\n    if:/);

  assert.match(rollover, /workflow_dispatch:\s*\n/);
  assert.doesNotMatch(rollover, /\n  pull_request:\s*\n|pull_request_target:\s*\n|\n  exact-head-audit:|\n  metadata-receipt:/);
  assert.match(rollover, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.doesNotMatch(rollover, /\n    if:/);
});
