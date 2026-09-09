import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/auth-email-provider.yml', 'utf8');
const script = fs.readFileSync('scripts/configure-supabase-auth-email.mjs', 'utf8');

test('production Auth email provider stays manual, exact-head, and main-only for apply', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /apply:/);
  assert.match(workflow, /default:\s*false/);
  assert.match(workflow, /test \"\$GITHUB_REF_NAME\" = main/);
  assert.match(workflow, /ref:\s*\$\{\{ steps\.target\.outputs\.target_sha \}\}/);
  assert.match(workflow, /EXPECTED_HEAD_SHA:\s*\$\{\{ steps\.target\.outputs\.target_sha \}\}/);
  assert.doesNotMatch(workflow, /ref:\s*\$\{\{ inputs\.target_sha \}\}/);
});

test('dispatch contract normalizes input and rejects malformed or stale production SHAs before checkout', () => {
  assert.match(workflow, /Normalize and validate dispatch contract/);
  assert.match(workflow, /TARGET_SHA_INPUT:\s*\$\{\{ inputs\.target_sha \}\}/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/);
  assert.match(workflow, /target_sha=\"\$\{target_sha,,\}\"/);
  assert.match(workflow, /printf 'target_sha=%s\\n' \"\$target_sha\" >> \"\$GITHUB_OUTPUT\"/);
  assert.match(workflow, /Pass apply as its own boolean input/);
  assert.match(workflow, /repos\/\$\{GITHUB_REPOSITORY\}\/commits\/main/);
  assert.match(workflow, /Production apply requires current main HEAD/);
  assert.match(workflow, /if \[ \"\$target_sha\" != \"\$current_main\" \]; then/);

  const validation = workflow.indexOf('- name: Normalize and validate dispatch contract');
  const checkout = workflow.indexOf('- name: Check out exact target');
  assert.notEqual(validation, -1);
  assert.notEqual(checkout, -1);
  assert.ok(validation < checkout, 'dispatch validation must run before checkout consumes normalized target_sha');

  const checkoutBlock = workflow.slice(checkout, workflow.indexOf('- name: Verify exact target'));
  assert.match(checkoutBlock, /steps\.target\.outputs\.target_sha/);
  assert.doesNotMatch(checkoutBlock, /inputs\.target_sha/);
});

test('production Auth email provider keeps confirmation enabled and secrets out of source', () => {
  assert.match(script, /mailer_autoconfirm:\s*false/);
  assert.match(script, /smtp\.resend\.com/);
  assert.match(script, /smtp_user: env\('AUTH_SMTP_USER', 'resend'\)/);
  assert.match(script, /required\('RESEND_API_KEY'\)/);
  assert.match(script, /required\('SUPABASE_ACCESS_TOKEN'\)/);
  assert.doesNotMatch(script, /re_[A-Za-z0-9]{8,}/);
  assert.match(script, /\(pass\|secret\|token\|key\)/i);
});

test('provider receipt is redacted and records rollback evidence', () => {
  assert.match(script, /auth-email-provider-receipt\.json/);
  assert.match(script, /before: redact\(before\)/);
  assert.match(script, /after: redact\(after\)/);
  assert.match(script, /priorConfigCaptured:\s*true/);
  assert.match(script, /do not disable email confirmation/);
});