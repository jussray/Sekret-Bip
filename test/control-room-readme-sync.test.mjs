import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relativePath) =>
  fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const readme = read('README.md');
const policy = read('.control-room/README_SYNC_POLICY.md');

test('README exposes Founder Control Room documentation truth synchronization', () => {
  assert.match(readme, /Founder Control Room/);
  assert.match(readme, /Live truth boundary/);
  assert.match(readme, /State → Evidence → Claim/);
  assert.match(readme, /docs\/TRUTH_AUTHORITY\.md/);
  assert.match(readme, /historical/i);
  assert.match(readme, /supersed/i);
});

test('Founder Control Room policy requires an explicit document impact decision', () => {
  assert.match(policy, /README impact decision/i);
  assert.match(policy, /required[\s\S]*not_required[\s\S]*deferred_with_reason/i);
  assert.match(policy, /durable/);
  assert.match(policy, /historical/);
  assert.match(policy, /live receipt/);
  assert.match(policy, /runner_startup_failure/);
  assert.match(policy, /Exact-head evidence expires/);
  assert.match(policy, /Live GitHub issue state outranks copied issue-state prose/);
  assert.match(policy, /audit-documentation-truth\.mjs/);
  assert.match(policy, /avoid claiming deployment or live proof from a merge alone/i);
});
