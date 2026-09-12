import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const workflowPath = path.join(root, '.github/workflows/reconcile-cloudflare-app-domain.yml');
const approvalPath = path.join(root, '.control-room/provider-mutation-approvals/cloudflare-app-domain.json');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const approval = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));

test('one-shot app-domain approval is exact-host, exact-operation, and parent-bound', () => {
  assert.deepEqual(
    {
      schemaVersion: approval.schemaVersion,
      operation: approval.operation,
      hostname: approval.hostname,
      pagesProject: approval.pagesProject,
      backendWorker: approval.backendWorker,
      approved: approval.approved,
      continuity: approval.continuity,
    },
    {
      schemaVersion: 1,
      operation: 'restore-pages-ownership',
      hostname: 'app.sekretbip.net',
      pagesProject: 'sekret-bip',
      backendWorker: 'sekret-backend',
      approved: true,
      continuity: 'one-shot-parent-bound',
    },
  );
  assert.match(approval.approvedParentSha, /^[0-9a-f]{40}$/);
  assert.match(approval.note, /does not authorize API-route changes/i);
});

test('workflow consumes repository approval only when the approval file changed in the triggering commit', () => {
  assert.match(workflow, /BIP_APP_RECONCILE_APPROVAL_FILE: \.control-room\/provider-mutation-approvals\/cloudflare-app-domain\.json/);
  assert.match(workflow, /git diff-tree --no-commit-id --name-only -r HEAD/);
  assert.match(workflow, /grep -Fxq "\$BIP_APP_RECONCILE_APPROVAL_FILE"/);
  assert.match(workflow, /approvedParentSha/);
  assert.match(workflow, /actual_parent="\$\(git rev-parse HEAD\^\)"/);
  assert.match(workflow, /One-shot provider approval is stale or replayed/);
});

test('all provider mutation steps remain gated by resolved bounded authority', () => {
  const gate = "if: steps.apply_authority.outputs.apply == 'true'";
  assert.ok(workflow.split(gate).length - 1 >= 5);
  assert.match(workflow, /Refusing Cloudflare route mutation because approved target is no longer current main/);
  assert.match(workflow, /Main advanced after provider preflight; refusing stale Cloudflare mutation authority/);
  assert.match(workflow, /scripts\/run-cloudflare-app-domain-reconcile-with-receipt\.mjs \\\n              --apply/);
});
