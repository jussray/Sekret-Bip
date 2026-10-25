import assert from 'node:assert/strict';
import test from 'node:test';
import { renderDiagnostics, summarizeDevSkimSarif } from '../scripts/report-devskim-diagnostics.mjs';

test('diagnostics disclose only bounded path, rule and level', () => {
  const sarif = {runs: [{results: [
    {ruleId: 'DS126858', level: 'error', message: {text: 'SECRET_PRIVATE_DATA_NEVER_LOG'}, locations: [{physicalLocation: {artifactLocation: {uri: '/github/workspace/supabase/functions/runtime-contract-health/index.ts'}, region: {startLine: 16}}}]},
    {ruleId: 'DS_UNTRUSTED\\nBAD', level: 'warning', locations: [{physicalLocation: {artifactLocation: {uri: 'test/runtime-truth-contract.test.mjs'}, region: {startLine: 90}}}]},
    {ruleId: 'OTHER', level: 'error', locations: [{physicalLocation: {artifactLocation: {uri: '/app/private/secrets.json'}, region: {startLine: 1}}}]},
  ]}]};
  const diagnostic = renderDiagnostics(summarizeDevSkimSarif(sarif));
  assert.match(diagnostic, /count=2/);
  assert.match(diagnostic, /rule=DS126858 level=error file=supabase\/functions\/runtime-contract-health\/index.ts line=16/);
  assert.match(diagnostic, /rule=unknown-rule level=warning/);
  assert.doesNotMatch(diagnostic, /SECRET_PRIVATE_DATA_NEVER_LOG|private\/secrets.json|BAD/);
});

test('malformed SARIF fails to infer findings from untrusted messages', () => {
  assert.deepEqual(summarizeDevSkimSarif({runs: [{results: [{message: {text: 'private'}}]}]}), []);
  assert.deepEqual(summarizeDevSkimSarif(null), []);
});
