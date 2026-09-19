import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/controlled-account-cloud-comfort.yml'), 'utf8');
const config = fs.readFileSync(path.join(root, 'playwright.controlled-account.config.ts'), 'utf8');
const cloudSpec = fs.readFileSync(path.join(root, 'e2e/controlled-account-cloud-comfort.spec.ts'), 'utf8');
const continuitySpec = fs.readFileSync(path.join(root, 'e2e/controlled-account-session-continuity.spec.ts'), 'utf8');

test('controlled-account workflow validates on PR but keeps live proof dispatch-only', () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /confirm_controlled_account_use:/);
  assert.match(workflow, /validate:\s*\n\s*if: github\.event_name == 'pull_request'/);
  assert.match(workflow, /proof:\s*\n\s*if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /EXPECTED_HEAD_SHA: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.target_sha \|\| github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /SEKRET_CONTROLLED_ACCOUNT_BASE_URL: https:\/\/app\.sekretbip\.net/);
  assert.match(workflow, /PRODUCTION_RELEASE_URL: https:\/\/app\.sekretbip\.net\/\.well-known\/sekret-release\.json/);
  assert.match(workflow, /body\?\.environment === 'production'/);
  assert.match(workflow, /body\?\.branch === 'main'/);
  assert.match(workflow, /test \"\$actual\" = \"\$EXPECTED_HEAD_SHA\"/);
});

test('live proof binds requested SHA to GitHub current main before reading controlled account secrets', () => {
  const proofStart = workflow.indexOf('  proof:');
  assert.ok(proofStart >= 0);
  const proofJob = workflow.slice(proofStart);

  const currentMainStep = proofJob.indexOf('Require requested head to equal current main');
  const productionStep = proofJob.indexOf('Verify canonical production serves exact current main');
  const authorityStep = proofJob.indexOf('Require explicit controlled-account authority');
  assert.ok(currentMainStep >= 0 && productionStep > currentMainStep && authorityStep > productionStep);
  assert.match(proofJob, /git ls-remote origin refs\/heads\/main/);
  assert.match(proofJob, /test \"\$current_main\" = \"\$EXPECTED_HEAD_SHA\"/);
  assert.match(proofJob, /String\(body\?\.commitSha \?\? ''\)\.toLowerCase\(\) === expected/);
});

test('PR validation compiles continuity proof without credentials or live account access', () => {
  const validateStart = workflow.indexOf('  validate:');
  const proofStart = workflow.indexOf('\n  proof:');
  assert.ok(validateStart >= 0 && proofStart > validateStart);
  const validateJob = workflow.slice(validateStart, proofStart);

  assert.match(validateJob, /test\/controlled-account-cloud-comfort-gate\.test\.mjs test\/auth-session-continuity\.test\.mjs/);
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

  for (const spec of [cloudSpec, continuitySpec]) {
    const receiptStart = spec.lastIndexOf('writeReceipt({');
    const receiptEnd = spec.indexOf('\n    });', receiptStart) >= 0
      ? spec.indexOf('\n    });', receiptStart)
      : spec.indexOf('\n  });', receiptStart);
    assert.ok(receiptStart >= 0 && receiptEnd > receiptStart);
    const receiptPayload = spec.slice(receiptStart, receiptEnd);
    assert.doesNotMatch(receiptPayload, /controlledEmail|controlledPassword|accessToken|userId/);
  }
});

test('controlled-account browser proof disables sensitive capture surfaces', () => {
  assert.match(config, /trace: 'off'/);
  assert.match(config, /screenshot: 'off'/);
  assert.match(config, /video: 'off'/);
  assert.match(config, /reporter: 'line'/);
  assert.match(config, /workers: 1/);
  assert.match(config, /retries: 0/);
  assert.match(config, /controlled-account-cloud-comfort\.spec\.ts/);
  assert.match(config, /controlled-account-session-continuity\.spec\.ts/);
  assert.doesNotMatch(`${cloudSpec}\n${continuitySpec}`, /page\.screenshot|test\.info\(\)\.attach|trace\.zip/);
});

test('Cloud proof remains explicitly synthetic and cannot be mistaken for provider proof', () => {
  assert.match(cloudSpec, /CI synthetic success check/);
  assert.match(cloudSpec, /Controlled synthetic reply\./);
  assert.match(cloudSpec, /page\.route\('\*\*\/api\/sekret\/reply'/);
  assert.match(cloudSpec, /context\.setOffline\(true\)/);
  assert.match(cloudSpec, /Are you real\?/);
  assert.match(cloudSpec, /cloudSyntheticSuccess: 'passed-with-intercepted-provider-request'/);
  assert.match(cloudSpec, /syntheticCloudContentOnly: true/);
  assert.match(cloudSpec, /privateUserContentUsed: false/);
});

test('continuity proof exercises real logout, relogin, durable recovery, and cleanup', () => {
  assert.match(continuitySpec, /page\.goto\('\/logout'\)/);
  assert.match(continuitySpec, /localStorage\.setItem\('entries'/);
  assert.match(continuitySpec, /localStorage\.getItem\(key\) === null/);
  assert.match(continuitySpec, /\/rest\/v1\/journal_entries\?on_conflict=user_id,id/);
  assert.match(continuitySpec, /method: 'DELETE'/);
  assert.match(continuitySpec, /durableJournalReadAfterRelogin: 'passed'/);
  assert.match(continuitySpec, /durableFixtureRecoveredAfterRelogin: 'passed'/);
  assert.match(continuitySpec, /providerFixtureDeleted: 'passed'/);
  assert.match(continuitySpec, /privateResponseBodiesCaptured: false/);
  assert.match(continuitySpec, /authTokensWrittenToReceipt: false/);
  assert.match(continuitySpec, /userIdsWrittenToReceipt: false/);
  assert.match(continuitySpec, /syntheticSentinelsOnly: true/);
  assert.doesNotMatch(continuitySpec, /page\.route\(/);
});

test('continuity fixture uses only the public Supabase key and never a privileged key', () => {
  assert.match(continuitySpec, /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(continuitySpec, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(continuitySpec, /not\.toMatch\(\/\^sb_secret_\//);
  assert.doesNotMatch(continuitySpec, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

test('Comfort proof checks authenticated controls without emitting completion', () => {
  assert.match(cloudSpec, /comfort-step-1/);
  assert.match(cloudSpec, /comfort-step-4/);
  assert.match(cloudSpec, /Open Calm Space and finish this Comfort visit/);
  assert.match(cloudSpec, /Finish this Comfort visit and return home/);
  assert.doesNotMatch(cloudSpec, /comfort_completed|finishComfort/);
});

test('uploaded receipts are sanitized and exclude browser reports', () => {
  assert.match(workflow, /artifacts\/controlled-account-cloud-comfort\.json/);
  assert.match(workflow, /artifacts\/controlled-account-session-continuity\.json/);
  assert.doesNotMatch(workflow, /playwright-report|test-results|trace\.zip/);
  assert.match(cloudSpec, /credentialValuesWrittenToReceipt: false/);
  assert.match(continuitySpec, /credentialValuesWrittenToReceipt: false/);
  assert.match(cloudSpec, /screenshotsCaptured: false/);
  assert.match(continuitySpec, /screenshotsCaptured: false/);
});
