import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/bearer.yml', import.meta.url), 'utf8');
const scanner = workflow.match(/      - name: Run Report\n[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';

test('scanner uses the exact PR head with no persisted checkout credentials', () => {
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /EXPECTED_SCANNED_SHA:/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SCANNED_SHA"/);
});

test('scanner findings fail the gate and SARIF is still retained', () => {
  assert.match(scanner, /"\$RUNNER_TEMP\/bearer" scan \./);
  assert.match(scanner, /set -euo pipefail/);
  assert.doesNotMatch(scanner, /BEARER_EXIT_CODE|--exit-code\s+0|continue-on-error/);
  assert.doesNotMatch(workflow, /BEARER_EXIT_CODE:\s*['"]?0/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /name: bearer-sarif-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});

test('malformed remote rules only receive bounded retries with fresh caches', () => {
  assert.match(scanner, /for attempt in 1 2 3/);
  assert.match(scanner, /export TMPDIR="\$RUNNER_TEMP\/bearer-rules-attempt-\$attempt"/);
  assert.match(scanner, /grep -Fq 'error loading remote rules: loading rules failed: gzip: invalid header'/);
  assert.match(scanner, /if test -s results\.sarif; then/);
  assert.match(scanner, /exit "\$result"/);
  assert.doesNotMatch(scanner, /\|\| true|BEARER_EXIT_CODE|continue-on-error/);
});
