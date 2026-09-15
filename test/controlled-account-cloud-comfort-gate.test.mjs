import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/controlled-account-cloud-comfort.yml'), 'utf8');
const config = fs.readFileSync(path.join(root, 'playwright.controlled-account.config.ts'), 'utf8');
const spec = fs.readFileSync(path.join(root, 'e2e/controlled-account-cloud-comfort.spec.ts'), 'utf8');

test('controlled-account workflow validates on PR but keeps credentialed proof dispatch-only', () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /target_url:/);
  assert.match(workflow, /confirm_controlled_account_use:/);
  assert.match(workflow, /validate:\s*\n\s*if: github\.event_name == 'pull_request'/);
  assert.match(workflow, /proof:\s*\n\s*if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /EXPECTED_HEAD_SHA: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.target_sha \|\| github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /SEKRET_CONTROLLED_ACCOUNT_BASE_URL: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.target_url \|\| 'https:\/\/sekretbip\.net' \}\}/);
  assert.match(workflow, /test \"\$actual\" = \"\$EXPECTED_HEAD_SHA\"/);
});

test('live proof binds the requested SHA and owned deployment before reading controlled account secrets', () => {
  const proofStart = workflow.indexOf('  proof:');
  assert.ok(proofStart >= 0);
  const proofJob = workflow.slice(proofStart);

  const targetBindStep = proofJob.indexOf('Bind controlled-account target to an owned origin');
  const currentMainStep = proofJob.indexOf('Require production target to equal current main');
  const releaseStep = proofJob.indexOf('Verify target origin serves the exact requested release');
  const authorityStep = proofJob.indexOf('Require explicit controlled-account authority');
  assert.ok(targetBindStep >= 0);
  assert.ok(currentMainStep > targetBindStep);
  assert.ok(releaseStep > currentMainStep);
  assert.ok(authorityStep > releaseStep);

  assert.match(proofJob, /url\.origin === 'https:\/\/sekretbip\.net'/);
  assert.match(proofJob, /url\.hostname\.endsWith\('\.sekret-bip\.pages\.dev'\)/);
  assert.match(proofJob, /CONTROLLED_TARGET_KIND=/);
  assert.match(proofJob, /CONTROLLED_TARGET_ORIGIN=/);
  assert.match(proofJob, /String\(body\?\.commitSha \?\? ''\)\.toLowerCase\(\) === expected/);
  assert.match(proofJob, /body\?\.environment === kind/);
  assert.match(proofJob, /body\?\.branch === 'main'/);
  assert.match(proofJob, /body\.branch !== 'main'/);
});

test('canonical production still requires the requested SHA to equal current main', () => {
  const proofStart = workflow.indexOf('  proof:');
  const proofJob = workflow.slice(proofStart);
  const currentMainStart = proofJob.indexOf('Require production target to equal current main');
  const releaseStart = proofJob.indexOf('Verify target origin serves the exact requested release');
  assert.ok(currentMainStart >= 0 && releaseStart > currentMainStart);

  const currentMainStep = proofJob.slice(currentMainStart, releaseStart);
  assert.match(currentMainStep, /if: env\.CONTROLLED_TARGET_KIND == 'production'/);
  assert.match(currentMainStep, /git ls-remote origin refs\/heads\/main/);
  assert.match(currentMainStep, /test \"\$current_main\" = \"\$EXPECTED_HEAD_SHA\"/);
});

test('PR validation compiles the proof without credentials or live account access', () => {
  const validateStart = workflow.indexOf('  validate:');
  const proofStart = workflow.indexOf('\n  proof:');
  assert.ok(validateStart >= 0 && proofStart > validateStart);
  const validateJob = workflow.slice(validateStart, proofStart);

  assert.match(validateJob, /node --test test\/controlled-account-cloud-comfort-gate\.test\.mjs/);
  assert.match(validateJob, /npm run type-check/);
  assert.match(validateJob, /playwright\.controlled-account\.config\.ts --list/);
  assert.doesNotMatch(validateJob, /SEKRET_CONTROLLED_ACCOUNT_EMAIL|SEKRET_CONTROLLED_ACCOUNT_PASSWORD|secrets\./);
});

test('controlled-account live proof requires masked repository secrets and never creates an account', () => {
  const proofStart = workflow.indexOf('  proof:');
  assert.ok(proofStart >= 0);
  const proofJob = workflow.slice(proofStart);

  assert.match(proofJob, /secrets\.SEKRET_CONTROLLED_ACCOUNT_EMAIL/);
  assert.match(proofJob, /secrets\.SEKRET_CONTROLLED_ACCOUNT_PASSWORD/);
  assert.match(proofJob, /CONFIRM_CONTROLLED_ACCOUNT_USE/);
  assert.doesNotMatch(proofJob, /auth\/v1\/signup|live-signup-mailbox|create account/i);
  assert.doesNotMatch(proofJob, /SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN|wrangler deploy/);

  const receiptStart = spec.lastIndexOf('writeReceipt({');
  const receiptEnd = spec.indexOf('\n  });', receiptStart);
  assert.ok(receiptStart >= 0 && receiptEnd > receiptStart);
  const receiptPayload = spec.slice(receiptStart, receiptEnd);
  assert.doesNotMatch(receiptPayload, /controlledEmail|controlledPassword/);
});

test('controlled-account browser proof falsifies the verification failure without allowing provider mutation', () => {
  assert.match(spec, /failVerificationRead = true/);
  assert.match(spec, /controlled_verification_read_failure/);
  assert.match(spec, /page\.route\('\*\*\/rest\/v1\/\*\*'/);
  assert.match(spec, /page\.route\('\*\*\/functions\/v1\/\*\*'/);
  assert.match(spec, /blockedSupabaseMutationRequests \+= 1/);
  assert.match(spec, /page\.goto\('\/comfort\?bipDevAudience=teen'\)/);
  assert.match(spec, /page\.goto\('\/circle\?bipDevAudience=teen'\)/);
  assert.match(spec, /limited-mode\|parent-link-verify/);
  assert.match(spec, /failVerificationRead = false/);
  assert.match(spec, /verificationFailurePreservesAuthenticatedComfort: 'passed'/);
  assert.match(spec, /verificationFailureKeepsSocialLocked: 'passed'/);
  assert.match(spec, /verificationRecoveryWithoutRelogin: 'passed'/);
  assert.match(spec, /productionMutationAllowed: false/);
});

test('controlled-account browser proof disables sensitive capture surfaces', () => {
  assert.match(config, /trace: 'off'/);
  assert.match(config, /screenshot: 'off'/);
  assert.match(config, /video: 'off'/);
  assert.match(config, /reporter: 'line'/);
  assert.match(config, /workers: 1/);
  assert.match(config, /retries: 0/);
  assert.doesNotMatch(spec, /page\.screenshot|test\.info\(\)\.attach|trace\.zip/);
});

test('Cloud proof uses synthetic content and blocks provider leakage during recovery', () => {
  assert.match(spec, /CI synthetic success check/);
  assert.match(spec, /Controlled synthetic reply\./);
  assert.match(spec, /page\.route\('\*\*\/api\/sekret\/reply'/);
  assert.match(spec, /context\.setOffline\(true\)/);
  assert.match(spec, /Are you real\?/);
  assert.match(spec, /syntheticCloudContentOnly: true/);
  assert.match(spec, /privateUserContentUsed: false/);
});

test('Comfort proof checks authenticated controls without emitting completion', () => {
  assert.match(spec, /comfort-step-1/);
  assert.match(spec, /comfort-step-4/);
  assert.match(spec, /Open Calm Space and finish this Comfort visit/);
  assert.match(spec, /Finish this Comfort visit and return home/);
  assert.doesNotMatch(spec, /comfort_completed|finishComfort/);
});

test('uploaded receipt is sanitized and excludes browser reports', () => {
  assert.match(workflow, /path: artifacts\/controlled-account-cloud-comfort\.json/);
  assert.doesNotMatch(workflow, /playwright-report|test-results|trace\.zip/);
  assert.match(spec, /credentialValuesWrittenToReceipt: false/);
  assert.match(spec, /screenshotsCaptured: false/);
  assert.match(spec, /traceCaptured: false/);
  assert.match(spec, /videoCaptured: false/);
});
