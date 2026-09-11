import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/audit-cloudflare-zone-access-coverage.yml', 'utf8');

test('public front-door audit is exact-head, independently retained, read-only, and action-pinned', () => {
  for (const required of [
    'EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'ref: ${{ env.EXPECTED_HEAD_SHA }}',
    'persist-credentials: false',
    'test "$actual" = "$EXPECTED_HEAD_SHA"',
    'id: current_main_gate',
    'test "$EXPECTED_HEAD_SHA" = "$current_main"',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
    'CLOUDFLARE_ACCESS_API_TOKEN: ${{ secrets.CLOUDFLARE_ACCESS_API_TOKEN }}',
    'CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_APP_BINDING_READ_API_TOKEN }}',
    'scripts/audit-cloudflare-app-binding-authority.mjs',
    'test/cloudflare-app-binding-authority-audit.test.mjs',
    'CLOUDFLARE_APP_BINDING_EVIDENCE_PATH: artifacts/cloudflare-app-binding-authority.json',
    'artifacts/cloudflare-app-binding-authority.json',
    'name: cloudflare-zone-access-coverage-${{ env.EXPECTED_HEAD_SHA }}',
    'id: evidence_upload',
    'evidence_artifact_id: ${{ steps.evidence_upload.outputs.artifact-id }}',
    'evidence_artifact_url: ${{ steps.evidence_upload.outputs.artifact-url }}',
    'evidence_artifact_digest: ${{ steps.evidence_upload.outputs.artifact-digest }}',
    'name: Publish sanitized binding receipt to Se’kret P0 ledger',
    "ISSUE_NUMBER: '925'",
    '<!-- sekret-app-binding-authority:${exactMain} -->',
  ]) {
    assert.ok(workflow.includes(required), `missing public front-door workflow contract: ${required}`);
  }

  const pullRequestIndex = workflow.indexOf('  pull_request:');
  const pushIndex = workflow.indexOf('  push:');
  const workflowDispatchIndex = workflow.indexOf('  workflow_dispatch:');
  const pullRequestBlock = workflow.slice(pullRequestIndex, pushIndex);
  const pushBlock = workflow.slice(pushIndex, workflowDispatchIndex);

  assert.ok(pullRequestIndex >= 0 && pushIndex > pullRequestIndex, 'pull_request and push triggers must both exist');
  assert.ok(workflowDispatchIndex > pushIndex, 'workflow_dispatch must follow the push trigger');
  assert.ok(pullRequestBlock.includes('paths:'), 'PR audit runs should remain scoped to audit-contract changes');
  assert.ok(pushBlock.includes('branches: [main]'), 'provider authority must reacquire on main pushes');
  assert.ok(!pushBlock.includes('paths:'), 'every main movement must reacquire provider authority, even when unrelated files changed');

  const accessTokenIndex = workflow.indexOf('CLOUDFLARE_ACCESS_API_TOKEN: ${{ secrets.CLOUDFLARE_ACCESS_API_TOKEN }}');
  const bindingTokenIndex = workflow.indexOf('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_APP_BINDING_READ_API_TOKEN }}');
  assert.ok(accessTokenIndex >= 0 && bindingTokenIndex >= 0, 'Access and binding audits must each receive their dedicated credential');
  assert.ok(accessTokenIndex < bindingTokenIndex, 'Access and binding credentials must remain independently scoped to their audit steps');
  assert.ok(!workflow.includes('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}'), 'public front-door audit must never receive the repository-wide Cloudflare token');

  const mainGateIndex = workflow.indexOf('- name: Require exact current main before Cloudflare secret use');
  const accessProviderIndex = workflow.indexOf('- name: Audit zone-scoped Access applications and policies');
  const bindingProviderIndex = workflow.indexOf('- name: Audit public app Pages and Worker binding authority');
  const receiptGuardIndex = workflow.indexOf('- name: Require redacted provider receipts before publication');
  const uploadIndex = workflow.indexOf('- name: Upload redacted public front-door evidence');
  const failClosedIndex = workflow.indexOf('- name: Fail closed after retaining provider evidence');
  const publisherIndex = workflow.indexOf('  publish_receipt:');

  assert.ok(mainGateIndex >= 0, 'exact-current-main provider gate must exist');
  assert.ok(accessProviderIndex > mainGateIndex, 'Access provider reads must occur after exact-current-main verification');
  assert.ok(bindingProviderIndex > accessProviderIndex, 'binding provider read must remain separate from Access read');
  assert.ok(receiptGuardIndex > bindingProviderIndex, 'receipt guard must run after both provider reads');
  assert.ok(uploadIndex > receiptGuardIndex, 'artifact upload must follow receipt validation');
  assert.ok(failClosedIndex > uploadIndex, 'provider failures must turn the job red only after evidence retention');
  assert.ok(publisherIndex > failClosedIndex, 'ledger publication must be a separate job');

  const accessStep = workflow.slice(accessProviderIndex, bindingProviderIndex);
  const bindingStep = workflow.slice(bindingProviderIndex, receiptGuardIndex);
  const uploadStep = workflow.slice(uploadIndex, failClosedIndex);
  const auditJob = workflow.slice(workflow.indexOf('  audit:'), publisherIndex);
  const publisherJob = workflow.slice(publisherIndex);

  assert.ok(accessStep.includes("if: github.event_name != 'pull_request'"), 'Access provider read must stay secret-free on PRs');
  assert.ok(accessStep.includes('continue-on-error: true'), 'Access failure must not prevent independent binding evidence');
  assert.ok(bindingStep.includes('always()'), 'binding read must survive an earlier independent Access audit failure');
  assert.ok(bindingStep.includes("steps.current_main_gate.outcome == 'success'"), 'binding read must remain blocked unless exact-current-main gate succeeded');
  assert.ok(bindingStep.includes('continue-on-error: true'), 'binding failure must still allow receipt retention and artifact upload');
  assert.ok(bindingStep.includes('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_APP_BINDING_READ_API_TOKEN }}'), 'binding read must use only the dedicated binding-read secret');
  assert.ok(!bindingStep.includes('CLOUDFLARE_ACCESS_API_TOKEN'), 'binding read must not receive the Access token');
  assert.ok(!bindingStep.includes('secrets.CLOUDFLARE_API_TOKEN'), 'binding read must not receive the repository-wide Cloudflare token');
  assert.ok(uploadStep.includes("steps.receipt_guard.outcome == 'success'"), 'artifact upload must not publish a partial provider receipt set');

  assert.ok(publisherJob.includes('permissions:\n      contents: read\n      actions: read\n      issues: write'), 'ledger publisher must carry only GitHub evidence-publication permissions');
  assert.ok(publisherJob.includes("github.event_name != 'pull_request'"), 'ledger publisher must never run on pull_request');
  assert.ok(publisherJob.includes('needs.audit.outputs.evidence_artifact_id'), 'ledger publisher must consume only the immutable artifact from the audit job');
  assert.ok(publisherJob.includes('cloudflare-app-binding-authority.json'), 'ledger publisher must read the binding receipt rather than infer provider state');
  assert.ok(publisherJob.includes("method = existing ? 'PATCH' : 'POST'"), 'ledger publication must update the exact-main marker instead of blindly duplicating it');
  assert.ok(!publisherJob.includes('CLOUDFLARE_API_TOKEN'), 'ledger publisher must never receive a Cloudflare API token');
  assert.ok(!publisherJob.includes('CLOUDFLARE_ACCESS_API_TOKEN'), 'ledger publisher must never receive the Access token');
  assert.ok(!publisherJob.includes('CLOUDFLARE_WORKERS_BUILDS_API_TOKEN'), 'ledger publisher must never receive the Workers Builds token');

  assert.ok(!workflow.includes('ref: ${{ github.sha }}'), 'public front-door audit must not validate the synthetic PR merge SHA');
  assert.ok(!/uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v\d+/u.test(workflow), 'security-sensitive actions must be SHA-pinned');
  assert.ok(!workflow.includes('CLOUDFLARE_WORKERS_BUILDS_API_TOKEN: ${{ secrets.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN }}'), 'public front-door audit must not receive the Workers Builds token');
  assert.ok(!/\brun:\s+.*(?:--apply|DELETE|POST|PATCH|PUT)/u.test(auditJob), 'Cloudflare-reading audit job must not expose a mutation command');
});

test('sanitized binding publisher has explicit Node 24 CommonJS async semantics', () => {
  const publisherIndex = workflow.indexOf('  publish_receipt:');
  const publisherJob = workflow.slice(publisherIndex);
  const heredocStart = publisherJob.indexOf("node <<'NODE'");
  const heredocEnd = publisherJob.indexOf('\n          NODE', heredocStart);
  const inlineNode = publisherJob.slice(heredocStart, heredocEnd);

  assert.ok(heredocStart >= 0 && heredocEnd > heredocStart, 'publisher inline Node program must be extractable');
  assert.match(inlineNode, /const fs = require\('node:fs'\);/);
  assert.match(inlineNode, /const path = require\('node:path'\);/);
  assert.match(inlineNode, /\(async \(\) => \{/);
  assert.match(inlineNode, /\}\)\(\)\.catch\(\(error\) => \{/);

  const iifeIndex = inlineNode.indexOf('(async () => {');
  const firstAwaitIndex = inlineNode.indexOf('await ');
  const catchIndex = inlineNode.indexOf('})().catch((error) => {');
  assert.ok(iifeIndex >= 0, 'async IIFE must exist');
  assert.ok(firstAwaitIndex > iifeIndex, 'all await expressions must be inside the async IIFE');
  assert.ok(catchIndex > firstAwaitIndex, 'publisher must fail closed through the IIFE rejection handler');
  assert.doesNotMatch(inlineNode.slice(0, iifeIndex), /\bawait\b/u);
});
