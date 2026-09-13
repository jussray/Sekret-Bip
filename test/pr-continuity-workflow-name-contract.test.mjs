import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('.github/workflows/pr-continuity.yml', 'utf8');
const exactHeadJob = source.slice(
  source.indexOf('  exact-head-audit:'),
  source.indexOf('  metadata-receipt:'),
);

test('non-pull-request continuity events cannot shadow the exact-head check name', () => {
  assert.ok(
    exactHeadJob.includes(
      "name: ${{ github.event_name == 'pull_request' && 'PR Continuity Exact-Head Gate' || 'PR Continuity Exact-Head Gate (not applicable)' }}",
    ),
  );
  assert.ok(exactHeadJob.includes("if: github.event_name == 'pull_request'"));
  assert.equal(/^\s{4}name: PR Continuity Exact-Head Gate$/mu.test(exactHeadJob), false);
});
