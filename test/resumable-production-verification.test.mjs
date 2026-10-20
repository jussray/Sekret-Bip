import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');

test('manual production reconciliation accepts only an exact current-main target release SHA', () => {
  assert.match(workflow, /workflow_dispatch:[\s\S]*target_sha:/);
  assert.match(workflow, /Exact current-main release commit to reconcile after a partial or interrupted deployment/);
  assert.match(workflow, /DEPLOYMENT_SHA:\s*\$\{\{ inputs\.target_sha \|\| github\.sha \}\}/);
  assert.match(workflow, /EXPECTED_RELEASE_SHA:\s*\$\{\{ inputs\.target_sha \|\| github\.sha \}\}/);
  assert.match(workflow, /Validate trusted release target before checkout/);
  assert.match(workflow, /Refusing to expose Production-scoped secrets to a target that is not current main/);
});

test('all exact-release checks run against the selected deployment SHA', () => {
  assert.match(workflow, /ref:\s*\$\{\{ env\.DEPLOYMENT_SHA \}\}/);
  assert.match(workflow, /GITHUB_SHA:\s*\$\{\{ env\.DEPLOYMENT_SHA \}\}/);
  assert.match(workflow, /cloudflare-native-deployment-evidence-\$\{\{ env\.DEPLOYMENT_SHA \}\}/);
});

test('reconciliation remains verification-only and does not claim automatic rollback', () => {
  assert.doesNotMatch(workflow, /rollback|restore previous|automatic recovery/i);
  assert.match(workflow, /Publish blocked exact production observation/);
});
