import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditDocumentationTruth } from '../scripts/audit-documentation-truth.mjs';

function fixture(source, mode = 'durable') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-doc-truth-'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/status.md'), source);
  return {
    root,
    contracts: [{ path: 'docs/status.md', mode }],
  };
}

test('durable docs reject a current exact SHA that can expire when main moves', () => {
  const { root, contracts } = fixture(`<!-- truth-mode: durable -->\n# Status\n## Live truth boundary\nResolve live state first.\nCurrent main is 0123456789abcdef0123456789abcdef01234567.\n`);
  const findings = auditDocumentationTruth({ rootDir: root, contracts });
  assert.ok(findings.some((finding) => finding.rule === 'durable-exact-sha'));
});

test('durable docs reject copied issue open/closed state', () => {
  const { root, contracts } = fixture(`<!-- truth-mode: durable -->\n# Status\n## Live truth boundary\nUse GitHub live state.\nIssue #646 is completed.\n`);
  const findings = auditDocumentationTruth({ rootDir: root, contracts });
  assert.ok(findings.some((finding) => finding.rule === 'durable-issue-state'));
});

test('durable docs reject volatile current provider outcomes', () => {
  const { root, contracts } = fixture(`<!-- truth-mode: durable -->\n# Status\n## Live truth boundary\nUse provider receipts.\nLatest provider attempt failed with HTTP 403.\n`);
  const findings = auditDocumentationTruth({ rootDir: root, contracts });
  assert.ok(findings.some((finding) => finding.rule === 'durable-current-provider-result'));
});

test('historical sections may preserve exact evidence without becoming current truth', () => {
  const { root, contracts } = fixture(`<!-- truth-mode: durable -->\n# Status\n## Live truth boundary\nResolve live state first.\n## Historical snapshot — preserved\nAt that time main was 0123456789abcdef0123456789abcdef01234567.\nIssue #646 was completed.\n`, 'durable');
  assert.deepEqual(auditDocumentationTruth({ rootDir: root, contracts }), []);
});

test('historical documents require an obvious banner', () => {
  const { root, contracts } = fixture(`<!-- truth-mode: historical -->\n# Old status\n`, 'historical');
  const findings = auditDocumentationTruth({ rootDir: root, contracts });
  assert.ok(findings.some((finding) => finding.rule === 'missing-historical-snapshot-banner'));
});

test('canonical repository documentation has zero truth-expiry findings', () => {
  assert.deepEqual(auditDocumentationTruth(), []);
});
