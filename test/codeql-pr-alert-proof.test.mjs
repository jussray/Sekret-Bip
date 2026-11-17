import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyFindingWaivers,
  summarizeSarifDocuments,
} from '../scripts/codeql-pr-alert-proof.mjs';

const workflow = fs.readFileSync(new URL('../.github/workflows/codeql-pr-alert-proof.yml', import.meta.url), 'utf8');
const CODEQL_SHA = 'ff2f1c621b7f889edc0d3c761ac2e6a3f8cdb0dd';

function sarif(results = []) {
  return {
    version: '2.1.0',
    runs: [{
      tool: { driver: { rules: [] } },
      results,
    }],
  };
}

test('local CodeQL workflow analyzes every current default-setup language on the deterministic runner', () => {
  assert.match(workflow, /name: Local CodeQL \(\$\{\{ matrix\.language \}\}\)/);
  assert.match(workflow, /runs-on:\s*ubuntu-22\.04/);
  assert.match(workflow, /- actions\s*\n\s*- javascript-typescript\s*\n\s*- python/);
  assert.match(workflow, /queries:\s*security-extended/);
});

test('security-sensitive workflow changes trigger local CodeQL proof', () => {
  assert.match(workflow, /- '\.github\/workflows\/founder-shield\.yml'/);
  assert.match(workflow, /- '\.github\/workflows\/product-design-playwright-proof\.yml'/);
  assert.match(workflow, /- '\.github\/workflows\/codeql-pr-alert-proof\.yml'/);
  assert.match(workflow, /- '\.github\/workflows\/pr-continuity\.yml'/);
});

test('local CodeQL action is immutable and never uploads competing Code Scanning results', () => {
  assert.match(workflow, new RegExp(`github/codeql-action/init@${CODEQL_SHA}`));
  assert.match(workflow, new RegExp(`github/codeql-action/analyze@${CODEQL_SHA}`));
  assert.match(workflow, /upload:\s*never/);
  assert.match(workflow, /upload-database:\s*false/);
  assert.doesNotMatch(workflow, /github\/codeql-action\/(?:init|analyze)@v\d+/);
  assert.doesNotMatch(workflow, /security-events:\s*write/);
});

test('local CodeQL SARIF summary preserves findings for fail-closed classification', () => {
  const clean = summarizeSarifDocuments([sarif([])]);
  assert.equal(clean.runCount, 1);
  assert.equal(clean.findingCount, 0);

  const finding = summarizeSarifDocuments([sarif([{
    ruleId: 'js/example',
    level: 'error',
    message: {text: 'example security result'},
    locations: [{
      physicalLocation: {
        artifactLocation: {uri: 'src/example.ts'},
        region: {startLine: 4, endLine: 4},
      },
    }],
  }])]);
  assert.equal(finding.findingCount, 1);
  assert.equal(finding.findings[0].ruleId, 'js/example');
  assert.equal(finding.findings[0].path, 'src/example.ts');
});

test('waivers are exact, bounded, expiring, and stale waivers fail closed', () => {
  const findings = [
    {ruleId: 'js/example', path: 'test/example.test.mjs', message: 'known static assertion'},
    {ruleId: 'js/example', path: 'test/example.test.mjs', message: 'new second assertion'},
  ];
  const waiverDocument = {
    schemaVersion: 1,
    waivers: [{
      id: 'test-static-assertion',
      language: 'javascript-typescript',
      ruleId: 'js/example',
      path: 'test/example.test.mjs',
      messageIncludes: 'assertion',
      maxMatches: 1,
      expiresAt: '2026-10-01T00:00:00Z',
      rationale: 'Static repository-owned test assertion with no runtime trust boundary.',
    }],
  };

  const classified = applyFindingWaivers(findings, waiverDocument, {
    language: 'javascript-typescript',
    now: new Date('2026-08-17T00:00:00Z'),
  });
  assert.equal(classified.waivedFindings.length, 1);
  assert.equal(classified.blockingFindings.length, 1);
  assert.equal(classified.waiverErrors.length, 1, 'match growth beyond maxMatches must fail closed');

  const stale = applyFindingWaivers([], waiverDocument, {
    language: 'javascript-typescript',
    now: new Date('2026-08-17T00:00:00Z'),
  });
  assert.equal(stale.waiverErrors.length, 1, 'a waiver that no longer matches must be removed');

  const expired = applyFindingWaivers([findings[0]], waiverDocument, {
    language: 'javascript-typescript',
    now: new Date('2026-10-02T00:00:00Z'),
  });
  assert.equal(expired.blockingFindings.length, 1);
  assert.match(expired.waiverErrors[0], /expired/);
});

test('local CodeQL proof preserves exact-head, waiver, and evidence boundaries', () => {
  assert.match(workflow, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /CODEQL_WAIVER_PATH:\s*security\/codeql-local-waivers\.json/);
  assert.match(workflow, /CODEQL_SARIF_DIR:/);
  assert.match(workflow, /EVIDENCE_DIR:/);
  assert.match(workflow, /node --test test\/codeql-pr-alert-proof\.test\.mjs/);
  assert.match(workflow, /node scripts\/codeql-pr-alert-proof\.mjs/);
  assert.match(workflow, /retention-days:\s*30/);
});

test('retired exact-head waiver history cannot suppress recurring findings', () => {
  const waiverDocument = JSON.parse(fs.readFileSync(new URL('../security/codeql-local-waivers.json', import.meta.url), 'utf8'));
  const retiredIds = [
    'worker-identity-test-url-substring',
    'pages-domain-array-membership',
    'pages-domain-array-membership-test',
  ];
  for (const id of retiredIds) {
    assert.equal(waiverDocument.waivers.some((entry) => entry.id === id), false,
      'an unused exception must leave the active waiver set');
    const retired = waiverDocument.retiredWaivers.find((entry) => entry.id === id);
    assert.ok(retired, 'retirement retains the original exception provenance');
    const recurrence = { ruleId: retired.ruleId, path: retired.path, message: retired.messageIncludes };
    const result = applyFindingWaivers([recurrence], {
      schemaVersion: 1, waivers: [], retiredWaivers: [retired],
    }, { language: retired.language, now: new Date('2026-11-01T16:36:21Z') });
    assert.equal(result.blockingFindings.length, 1);
    assert.equal(result.waivedFindings.length, 0);
    assert.deepEqual(result.waiverErrors, []);
  }
});
