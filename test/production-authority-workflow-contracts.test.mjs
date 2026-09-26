import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKOUT_SHA = '11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const UPLOAD_ARTIFACT_SHA = 'ea165f8d65b6e75b540449e92b4886f43607fa02';
const SUPABASE_SETUP_SHA = 'ab058987d8d6c725971f6cf9d0b5c98467e30bd1';

function workflow(name) {
  return fs.readFileSync(path.join(repositoryRoot, '.github/workflows', name), 'utf8');
}

function assertPinnedNodeWorkflow(content) {
  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`actions/setup-node@${SETUP_NODE_SHA}`));
  assert.match(content, new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.doesNotMatch(content, /actions\/(?:checkout|setup-node|upload-artifact)@v\d+/);
}

function assertCancelsSupersededRuns(content) {
  assert.match(content, /concurrency:\s*\n\s*group:/);
  assert.match(content, /cancel-in-progress:\s*true/);
}

function assertKnownWorkingProofRunner(content) {
  assert.match(content, /runs-on:\s*ubuntu-22\.04/);
  assert.doesNotMatch(content, /runs-on:\s*ubuntu-latest/);
}

test('CodeQL proof uses immutable actions, a deterministic runner, and cancels stale heads', () => {
  const content = workflow('codeql-pr-alert-proof.yml');

  assertPinnedNodeWorkflow(content);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  assert.match(content, /actual="\$\(git rev-parse HEAD\)"/);
});

test('Production Gate obeys the exact-head supply-chain and scheduler boundary it enforces', () => {
  const content = workflow('production-gate-contract.yml');

  assertPinnedNodeWorkflow(content);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  assert.match(content, /actual="\$\(git rev-parse HEAD\)"/);
  assert.match(content, /test\/production-authority-workflow-contracts\.test\.mjs/);
});

test('GitHub merge membrane evaluates untrusted PRs only from trusted base source', () => {
  const content = workflow('github-merge-membrane.yml');

  assertPinnedNodeWorkflow(content);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /\n  pull_request_target:\n/);
  assert.doesNotMatch(content, /\n  pull_request:\n/);
  assert.match(content, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(content, /TRUSTED_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(content, /ref: \$\{\{ env\.TRUSTED_BASE_SHA \}\}/);
  assert.doesNotMatch(content, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);
  assert.match(content, /contents: read/);
  assert.match(content, /checks: read/);
  assert.match(content, /pull-requests: read/);
  assert.doesNotMatch(content, /contents: write|pull-requests: write|actions: write/);
  assert.match(content, /node scripts\/verify-github-merge-membrane\.mjs/);
});

test('Product Design proof uses a deterministic runner and cancels superseded UX evidence', () => {
  const content = workflow('product-design-playwright-proof.yml');

  assertPinnedNodeWorkflow(content);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
});

test('Founder Shield proves the anonymous public edge with minimal credentials and deterministic evidence', () => {
  const content = workflow('founder-shield.yml');

  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.doesNotMatch(content, /actions\/(?:checkout|upload-artifact)@v\d+/);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /ref: \$\{\{ env\.EXPECTED_HEAD_SHA \}\}/);

  assert.ok(content.includes('verify-live-edge:\n    name: Verify anonymous live edge on main'));
  assert.ok(content.includes("if: github.event_name == 'push'"));
  assert.ok(content.includes('environment: Production'));
  assert.ok(content.includes('https://sekretbip.net/.well-known/sekret-release.json'));
  assert.ok(content.includes('commitSha: expected'));
  assert.ok(content.includes("deploymentProvider: 'cloudflare-pages'"));
  assert.ok(content.includes("canonicalUrl: 'https://sekretbip.net'"));
  assert.ok(content.includes("host === 'cloudflareaccess.com'"));
  assert.ok(content.includes("host.endsWith('.cloudflareaccess.com')"));
  assert.ok(content.includes("path.startsWith('/cdn-cgi/access/')"));
  assert.equal(content.includes('CLOUDFLARE_ACCESS_CLIENT_ID'), false);
  assert.equal(content.includes('CLOUDFLARE_ACCESS_CLIENT_SECRET'), false);
  assert.equal(content.toLowerCase().includes('cf-access-client-id:'), false);
  assert.equal(content.toLowerCase().includes('cf-access-client-secret:'), false);
  assert.equal(
    (content.match(/--output \/dev\/null/g) || []).length,
    3,
    'non-release public-edge response bodies must not be retained',
  );
  assert.doesNotMatch(
    content,
    /--output artifacts\/founder-shield-live\/.*\.body/,
    'public-edge response bodies must not enter retained evidence',
  );
  assert.ok(
    content.includes('set-cookie|cookie|authorization|proxy-authorization|cf-authorization|cf-access-token|cf-access-client-id|cf-access-client-secret'),
    'Founder Shield must redact reusable session or access credentials if providers emit them in response headers',
  );
  assert.match(content, /\[REDACTED\]/);
});

test('Repository Truth uses the same deterministic proof runner and stale-head cancellation', () => {
  const content = workflow('repository-truth-gate.yml');

  assertPinnedNodeWorkflow(content);
  assertCancelsSupersededRuns(content);
  assertKnownWorkingProofRunner(content);
});

test('routine Supabase production workflow cannot rewrite migration history', () => {
  const content = workflow('deploy-supabase-migrations.yml');

  assert.match(content, /options:\s*\n\s*- dry-run\s*\n\s*- apply/);
  assert.doesNotMatch(content, /normalize-alias/i);
  assert.doesNotMatch(content, /migration repair/i);
  assert.doesNotMatch(content, /canonical_version/i);
  assert.doesNotMatch(content, /execution_version/i);
  assert.match(content, /environment: production/);
});

test('routine Supabase production workflow is exact-main, dry-run-first, and supply-chain pinned', () => {
  const content = workflow('deploy-supabase-migrations.yml');

  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`supabase/setup-cli@${SUPABASE_SETUP_SHA}`));
  assert.match(content, /version: 2\.113\.0/);
  assert.match(content, new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.doesNotMatch(content, /(?:actions\/checkout|actions\/upload-artifact|supabase\/setup-cli)@v\d+/);

  const exactTarget = content.indexOf('- name: Verify exact target is current main');
  const dryRun = content.indexOf('- name: Preview production migration plan');
  const preMutation = content.indexOf('- name: Re-verify current main immediately before mutation');
  const apply = content.indexOf('- name: Apply production migrations');
  const postVerify = content.indexOf('- name: Verify exact production schema after mutation');

  assert.ok(exactTarget >= 0);
  assert.ok(dryRun > exactTarget);
  assert.ok(preMutation > dryRun);
  assert.ok(apply > preMutation);
  assert.ok(postVerify > apply);
  assert.match(content, /test "\$TARGET_SHA" = "\$current_main"/);
  assert.match(content, /supabase db push --linked --dry-run/);
  assert.match(content, /supabase db push --linked 2>&1/);
});

test('production Edge Function deployment is exact-current-main and immutable before mutation', () => {
  const content = workflow('deploy-supabase-function.yml');

  assert.match(content, /environment:\s*production/);
  assert.match(content, /EXPECTED_HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`supabase/setup-cli@${SUPABASE_SETUP_SHA}`));
  assert.match(content, /version: 2\.113\.0/);
  assert.doesNotMatch(content, /supabase\/setup-cli@v\d+/);

  const exactTarget = content.indexOf('- name: Verify exact target is current main');
  const preMutation = content.indexOf('- name: Re-verify current main immediately before mutation');
  const deploy = content.indexOf('- name: Deploy selected function');
  assert.ok(exactTarget >= 0);
  assert.ok(preMutation > exactTarget);
  assert.ok(deploy > preMutation);
  assert.match(content, /test "\$EXPECTED_HEAD_SHA" = "\$current_main"/);
});

test('Pages deploy hook is manual-only, exact-current-main, and cannot masquerade as release proof', () => {
  const content = workflow('cloudflare-pages-deploy-hook.yml');

  assert.match(content, /on:\s*\n\s*workflow_dispatch:/);
  assert.doesNotMatch(content, /\n\s*push:/);
  assert.doesNotMatch(content, /\n\s*pull_request:/);
  assert.match(content, /environment:\s*Production/);
  assertKnownWorkingProofRunner(content);
  assert.match(content, /EXPECTED_HEAD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(content, /test "\$EXPECTED_HEAD_SHA" = "\$current_main"/);
  assert.match(content, /CLOUDFLARE_DEPLOY_HOOK_URL: \$\{\{ secrets\.CLOUDFLARE_DEPLOY_HOOK_URL \}\}/);
  assert.match(content, /--request POST/);
  assert.match(content, /This is trigger evidence, not deployed-runtime or Playwright proof\./);

  const exactMainGuard = content.indexOf('- name: Verify dispatch target is exact current main');
  const hookSecret = content.indexOf('CLOUDFLARE_DEPLOY_HOOK_URL: ${{ secrets.CLOUDFLARE_DEPLOY_HOOK_URL }}');
  const hookCall = content.indexOf('--request POST');
  assert.ok(exactMainGuard >= 0);
  assert.ok(hookSecret > exactMainGuard);
  assert.ok(hookCall > hookSecret);
});
