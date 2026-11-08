import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/bearer.yml', import.meta.url), 'utf8');
const scan = workflow.match(/      - name: Run Report\n[\s\S]*?(?=\n      - name:|$)/)?.[0] ?? '';

test('Bearer scanner is pinned to a published version and runs on the exact PR head', () => {
  assert.match(scan, /version:\s*v2\.1\.3\b/);
  assert.match(workflow, /EXPECTED_SCANNED_SHA:/);
  assert.match(workflow, /persist-credentials:\s*false/);
});
test('Bearer findings remain fail-closed and SARIF artifacts are retained', () => {
  assert.doesNotMatch(scan, /exit-code:\s*0\b/);
  assert.match(workflow, /if-no-files-found:\s*error/);
  assert.match(workflow, /name: bearer-sarif-/);
  assert.match(workflow, /- name: Upload SARIF file\n\s+if: always\(\)/);
});
