import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/auth-password-security.yml', 'utf8');
const script = fs.readFileSync('scripts/configure-supabase-password-security.mjs', 'utf8');

test('production Auth password security stays manual, exact-head, and main-only for apply', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /apply:/);
  assert.match(workflow, /default:\s*false/);
  assert.match(workflow, /test \"\$GITHUB_REF_NAME\" = main/);
  assert.match(workflow, /ref:\s*\$\{\{ steps\.target\.outputs\.target_sha \}\}/);
  assert.match(workflow, /EXPECTED_HEAD_SHA:\s*\$\{\{ steps\.target\.outputs\.target_sha \}\}/);
  assert.doesNotMatch(
    workflow,
    /(?:ref|EXPECTED_HEAD_SHA):\s*\$\{\{ inputs\.target_sha \}\}/,
    'the unvalidated dispatch input must not reach checkout or head verification',
  );
});

test('dispatch contract rejects malformed or stale production target SHAs before checkout', () => {
  assert.match(workflow, /Normalize and validate dispatch contract/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/);
  assert.match(workflow, /Pass apply as its own boolean input/);
  assert.match(workflow, /repos\/\$\{GITHUB_REPOSITORY\}\/commits\/main/);
  assert.match(workflow, /Production apply requires current main HEAD/);
  assert.match(workflow, /if \[ \"\$target_sha\" != \"\$current_main\" \]; then/);

  const validation = workflow.indexOf('- name: Normalize and validate dispatch contract');
  const checkout = workflow.indexOf('- name: Check out exact target');
  assert.notEqual(validation, -1);
  assert.notEqual(checkout, -1);
  assert.ok(validation < checkout, 'dispatch validation must run before checkout consumes target_sha');
});

test('apply is gated on the real credential and never a hardcoded field value', () => {
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN is not configured/);
  assert.match(script, /required\('SUPABASE_ACCESS_TOKEN'\)/);
  assert.doesNotMatch(script, /['"]sb[a-z]*_[A-Za-z0-9]{20,}['"]/, 'no live-looking token literal in source');
});

test('the script refuses to patch a field the live config does not already return', () => {
  // The Management API silently drops unknown PATCH fields instead of
  // rejecting them -- without this guard a renamed field would make the
  // script report PASSWORD_SECURITY_CONFIG_APPLIED while changing nothing.
  assert.match(script, /if \(!\(key in before\)\)/);
  assert.match(script, /PASSWORD_SECURITY_FIELD_UNKNOWN/);
});

test('desired config enables HaveIBeenPwned checking and a real minimum length', () => {
  assert.match(script, /HIBP_FIELD = 'password_hibp_enabled'/);
  assert.match(script, /\[HIBP_FIELD\]: true/);
  assert.match(script, /MIN_LENGTH_FIELD = 'password_min_length'/);
  assert.match(script, /MIN_LENGTH = 8/);
});

test('receipt is redacted and records rollback evidence', () => {
  assert.match(script, /auth-password-security-receipt\.json/);
  assert.match(script, /before: redact\(before\)/);
  assert.match(script, /after: redact\(after\)/);
  assert.match(script, /priorConfigCaptured:\s*true/);
  assert.match(script, /\(pass\|secret\|token\|key\)/i);
});
