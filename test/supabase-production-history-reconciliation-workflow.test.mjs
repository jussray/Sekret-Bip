import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const WORKFLOW_PATH = '.github/workflows/reconcile-supabase-production-history.yml';
const FOUNDER_COMMAND_PATH = '.github/workflows/app-domain-founder-command.yml';
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const founderCommand = fs.readFileSync(FOUNDER_COMMAND_PATH, 'utf8');

const baselineLiveVersions = [
  '20260723203050',
  '20260723203116',
  '20260820214601',
  '20260821073219',
  '20260826065736',
];

const baselineCanonicalVersions = [
  '20260718035000',
  '20260718035500',
  '20260820211200',
  '20260821071500',
  '20260824223800',
];

const securityLiveVersions = [
  '20260905233953',
  '20260905234133',
  '20260905234009',
  '20260905234019',
  '20260905234039',
  '20260905234048',
];

const securityCanonicalVersions = [
  '20260826012500',
  '20260827060000',
  '20260827061000',
  '20260827062000',
  '20260827063000',
  '20260831233000',
];

test('history reconciliation is manual, exact-current-main, and production-gated', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  pull_request:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /confirm_project:/);
  assert.match(workflow, /RECONCILE SIX SECURITY RECEIPT ALIASES/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: supabase-production-migrations/);
  assert.match(workflow, /git fetch --no-tags --depth=1 origin main/);
  assert.match(workflow, /Refusing production history reconciliation from a SHA that is no longer current main\./);
  assert.match(workflow, /Main advanced after pre-mutation proof; refusing production history reconciliation\./);
  assert.match(workflow, /Main advanced before final production history proof; refusing stale success evidence\./);
});

test('workflow requires the reconciled five-pair baseline and repairs exactly six receipted aliases', () => {
  assert.doesNotMatch(workflow, /repair_version:/);
  assert.doesNotMatch(workflow, /canonical_version:/);
  for (const version of [
    ...baselineLiveVersions,
    ...baselineCanonicalVersions,
    ...securityLiveVersions,
    ...securityCanonicalVersions,
  ]) {
    assert.match(workflow, new RegExp(version));
  }
  assert.match(workflow, /Previously reconciled five-pair production baseline is not clean; refusing six-receipt mutation/);
  assert.match(workflow, /supabase migration repair[\s\S]*--status applied --db-url/);
  assert.match(workflow, /supabase migration repair[\s\S]*--status reverted --db-url/);
});

test('history-only reconciliation requires completed security work', () => {
  assert.match(workflow, /PENDING_SECURITY_MIGRATIONS\.length !== 0/);
  assert.match(workflow, /requires zero pending production security migrations/);
});

test('security receipt reconciliation is idempotent and fails closed on mixed history', () => {
  assert.match(workflow, /id: history_state/);
  assert.match(workflow, /mode = 'needs-reconciliation'/);
  assert.match(workflow, /mode = 'already-reconciled'/);
  assert.match(workflow, /Production security receipt history is mixed or ambiguous; refusing mutation/);
  assert.match(workflow, /if: steps\.history_state\.outputs\.mode == 'needs-reconciliation'/);
  assert.match(workflow, /if: steps\.history_state\.outputs\.mode == 'already-reconciled'/);
  assert.match(workflow, /supabase-history-precondition-state\.json/);
  assert.match(workflow, /verifiedReconciledFivePairBaseline/);
  assert.match(workflow, /verifiedExactSixSecurityReceiptShape/);
});

test('canonical markers are inserted before receipted aliases are retired', () => {
  const applyCanonical = workflow.indexOf('- name: Mark canonical security receipt versions applied');
  const retireAliases = workflow.indexOf('- name: Retire receipted live aliases');
  const postVerify = workflow.indexOf('- name: Verify exact post-reconciliation migration history');
  assert.ok(applyCanonical >= 0);
  assert.ok(retireAliases > applyCanonical);
  assert.ok(postVerify > retireAliases);
});

test('history reconciliation cannot apply migration SQL', () => {
  const dbPushLines = workflow.split('\n').filter((line) => line.includes('supabase db push'));
  assert.equal(dbPushLines.length, 1);
  assert.match(dbPushLines[0], /--db-url .*--dry-run/);
  assert.doesNotMatch(workflow, /supabase link/);
  assert.doesNotMatch(workflow, /supabase migration up/);
  assert.doesNotMatch(workflow, /apply_migration|psql\s|execute_sql/i);
});

test('workflow preserves precondition, before, midpoint, after, and dry-run evidence', () => {
  assert.match(workflow, /supabase-history-precondition-state\.json/);
  assert.match(workflow, /supabase-migration-list-before-reconciliation\.txt/);
  assert.match(workflow, /supabase-history-canonical-applied\.txt/);
  assert.match(workflow, /supabase-migration-list-mid-reconciliation\.txt/);
  assert.match(workflow, /supabase-history-live-reverted\.txt/);
  assert.match(workflow, /supabase-migration-list-after-reconciliation\.txt/);
  assert.match(workflow, /supabase-db-push-after-history-reconciliation\.txt/);
  assert.match(workflow, /if: always\(\)/);
});

test('workflow uses the IPv4 session-pooler path and no stale Supabase management token', () => {
  assert.ok(workflow.split('\n').some((line) => line.trim() === 'SUPABASE_POOLER_HOST: aws-1-us-east-1.pooler.supabase.com'));
  assert.match(workflow, /postgres\.\$\{SUPABASE_PROJECT_REF\}/);
  assert.match(workflow, /supabase migration list --db-url/);
  assert.match(workflow, /supabase db push --db-url/);
  assert.doesNotMatch(workflow, /SUPABASE_ACCESS_TOKEN/);
});

test('workflow pins repository and Supabase action identities', () => {
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /supabase\/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1/);
  assert.match(workflow, /version: 2\.113\.0/);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.doesNotMatch(workflow, /(?:actions\/checkout|actions\/upload-artifact|supabase\/setup-cli)@v\d+/);
});

test('founder command bridge keeps reconciliation and production verification bounded to existing workflows', () => {
  assert.match(founderCommand, /actions: write/);
  assert.match(founderCommand, /ISSUE_NUMBER: \$\{\{ github\.event\.issue\.number \}\}/);
  assert.match(founderCommand, /COMMENT_AUTHOR: \$\{\{ github\.event\.comment\.user\.login \}\}/);
  assert.match(founderCommand, /if issue == '925' and author == 'jussray':/);
  assert.match(founderCommand, /\/reconcile-app-domain/);
  assert.match(founderCommand, /reconcile-cloudflare-app-domain\.yml\/dispatches/);
  assert.match(founderCommand, /\/reconcile-supabase-history/);
  assert.match(founderCommand, /reconcile-supabase-production-history\.yml\/dispatches/);
  assert.match(founderCommand, /\/verify-production/);
  assert.match(founderCommand, /deploy-cloudflare\.yml\/dispatches/);
  assert.match(founderCommand, /tbsevonvegdnlyjgplmm/);
  assert.match(founderCommand, /RECONCILE SIX SECURITY RECEIPT ALIASES/);
  assert.match(founderCommand, /exactly six receipt-backed migration aliases/);
});

test('founder command bridge carries authority but no provider credentials or execution primitives', () => {
  assert.doesNotMatch(founderCommand, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(founderCommand, /supabase migration repair|supabase db push|supabase migration up|execute_sql|apply_migration|wrangler deploy/i);
});
