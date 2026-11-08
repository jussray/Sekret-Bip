import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/bearer.yml', import.meta.url), 'utf8');
const scan = workflow.match(/      - name: Run Report\n[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';

test('Bearer CLI release is pinned and cryptographically checked before use', () => {
  assert.match(workflow, /gh release download v2\.1\.3/);
  assert.match(workflow, /bearer_2\.1\.3_linux_amd64\.tar\.gz/);
  assert.match(workflow, /974d4ad7bb71bc578675684d444e345e8fbad91c85557aac035406ef5cc04c68/);
  assert.match(workflow, /sha256sum --check --status/);
  assert.match(workflow, /for attempt in 1 2 3/);
  assert.match(workflow, /EXPECTED_SCANNED_SHA:/);
  assert.match(workflow, /persist-credentials:\s*false/);
});

test('Bearer fails on findings and preserves SARIF evidence', () => {
  assert.match(scan, /bearer scan \. --format sarif --output results\.sarif/);
  assert.doesNotMatch(scan, /--exit-code\s+0\b/);
  assert.match(workflow, /if-no-files-found:\s*error/);
  assert.match(workflow, /name: bearer-sarif-/);
  assert.match(workflow, /- name: Upload SARIF file\n\s+if: always\(\)/);
});
