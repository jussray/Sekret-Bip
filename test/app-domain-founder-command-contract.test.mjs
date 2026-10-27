import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(
  new URL('../.github/workflows/app-domain-founder-command.yml', import.meta.url),
  'utf8',
);

const dispatchJob = workflow.slice(workflow.indexOf('  dispatch:\n'));

function stepBlock(name) {
  const marker = `- name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing founder command step: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

test('founder command workflow always executes one routing job instead of producing zero-step skipped jobs', () => {
  assert.match(workflow, /issue_comment:/);
  assert.match(dispatchJob, /name: Route bounded founder reconciliation command/);
  assert.match(dispatchJob, /- name: Classify founder command/);
  assert.match(dispatchJob, /FOUNDER_COMMAND_ROUTE=/);
  assert.match(dispatchJob, /- name: Record ignored comment/);
  assert.doesNotMatch(
    dispatchJob.slice(0, dispatchJob.indexOf('    steps:')),
    /\n\s+if:/u,
    'the single router job must not be job-condition skipped on unrelated comments',
  );
});

test('router recognizes commands only on launch gate 925 from founder jussray', () => {
  const route = stepBlock('Classify founder command');
  assert.match(route, /issue == '925'/);
  assert.match(route, /author == 'jussray'/);
  assert.match(route, /body\.startswith\('\/reconcile-app-domain '\)/);
  assert.match(route, /body\.startswith\('\/reconcile-supabase-history '\)/);
  assert.match(route, /body\.startswith\('\/verify-production '\)/);
  assert.match(route, /command = 'none'/);
});

test('app-domain command binds exact approved main into only its existing bounded reconcile', () => {
  const parse = stepBlock('Parse app-domain founder command');
  const verify = stepBlock('Verify app-domain SHA is current main');
  const dispatch = stepBlock('Dispatch existing bounded app-domain reconcile');

  assert.match(parse, /steps\.route\.outputs\.command == 'app-domain'/);
  assert.match(parse, /Expected exactly: \/reconcile-app-domain <40-char-main-sha> <approval-reference>/);
  assert.match(parse, /re\.fullmatch\(r'\[0-9a-f\]\{40\}', sha\)/);
  assert.match(verify, /\/git\/ref\/heads\/main/);
  assert.match(verify, /test "\$CURRENT_MAIN_SHA" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(dispatch, /reconcile-cloudflare-app-domain\.yml\/dispatches/);
  assert.match(dispatch, /EXPECTED_HEAD_SHA: \$\{\{ steps\.app-domain-command\.outputs\.expected_head_sha \}\}/);
  assert.match(dispatch, /target_sha:\$sha/);
  assert.match(dispatch, /apply:true/);
  assert.doesNotMatch(dispatch, /wrangler deploy/);
  assert.doesNotMatch(dispatch, /CLOUDFLARE_API_TOKEN/);
  assert.doesNotMatch(dispatch, /SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(dispatch, /reconcile-supabase-production-history/);
});

test('Supabase history command remains founder-bound and separate from app-domain mutation authority', () => {
  const parse = stepBlock('Parse Supabase history founder command');
  const verify = stepBlock('Verify Supabase history SHA is current main');
  const dispatch = stepBlock('Dispatch exact six-receipt Supabase history reconciliation');

  assert.match(parse, /steps\.route\.outputs\.command == 'supabase-history'/);
  assert.match(parse, /Expected exactly: \/reconcile-supabase-history <40-char-main-sha> <approval-reference>/);
  assert.match(parse, /re\.fullmatch\(r'\[0-9a-f\]\{40\}', sha\)/);
  assert.match(verify, /test "\$CURRENT_MAIN_SHA" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(dispatch, /reconcile-supabase-production-history\.yml\/dispatches/);
  assert.match(dispatch, /target_sha: \$sha/);
  assert.match(dispatch, /RECONCILE SIX SECURITY RECEIPT ALIASES/);
  assert.doesNotMatch(dispatch, /SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(dispatch, /CLOUDFLARE_API_TOKEN/);
});

test('production verification command can force the real exact-current-main proof path without provider mutation authority in the bridge', () => {
  const parse = stepBlock('Parse production verification founder command');
  const verify = stepBlock('Verify production target SHA is current main');
  const dispatch = stepBlock('Dispatch exact-current-main production verification');

  assert.match(parse, /steps\.route\.outputs\.command == 'production-verify'/);
  assert.match(parse, /Expected exactly: \/verify-production <40-char-main-sha> <approval-reference>/);
  assert.match(parse, /re\.fullmatch\(r'\[0-9a-f\]\{40\}', sha\)/);
  assert.match(verify, /test "\$CURRENT_MAIN_SHA" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(dispatch, /deploy-cloudflare\.yml\/dispatches/);
  assert.match(dispatch, /target_sha:\$sha/);
  assert.doesNotMatch(dispatch, /CLOUDFLARE_API_TOKEN|SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD/);
  assert.doesNotMatch(dispatch, /wrangler deploy|migration repair|db push/);
});
