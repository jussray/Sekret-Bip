import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {classifyProductionImpact} from '../scripts/classify-production-impact.mjs';

const workflow = readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');

function workflowStepBlock(name) {
  const marker = `- name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing production workflow step: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

test('Cloudflare native deployment verifier is credential-minimal and action-pinned', () => {
  for (const required of [
    'ref: ${{ env.DEPLOYMENT_SHA }}',
    'persist-credentials: false',
    'test "$actual" = "$EXPECTED_RELEASE_SHA"',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    'environment: Production',
    'RELEASE_OBSERVATION_MODE: blocked',
  ]) {
    assert.ok(workflow.includes(required), `missing deployment workflow contract: ${required}`);
  }

  assert.ok(!/uses:\s+actions\/(?:checkout|setup-node|upload-artifact)@v\d+/u.test(workflow), 'production verifier actions must be SHA-pinned');
  assert.ok(!workflow.includes('persist-credentials: true'), 'production verifier checkout credentials must not persist');
});

test('production verification classifies every main push instead of relying on a drifting positive path list', () => {
  for (const required of [
    'classify-production-impact:',
    'fetch-depth: 0',
    'needs: classify-production-impact',
    "needs.classify-production-impact.outputs.production_impact != 'false'",
  ]) {
    assert.ok(workflow.includes(required), `missing scope-aware deployment contract: ${required}`);
  }

  assert.doesNotMatch(workflow, /push:\s*\n\s*branches: \[main\]\s*\n\s*paths:/u);
});

test('main-push classification executes the previous trusted main classifier, never target-controlled classifier code', () => {
  for (const required of [
    'trusted_classifier="$RUNNER_TEMP/classify-production-impact.mjs"',
    'git show "$BEFORE_SHA:scripts/classify-production-impact.mjs" > "$trusted_classifier"',
    'node "$trusted_classifier"',
    'reason=trusted-classifier-unavailable',
  ]) {
    assert.ok(workflow.includes(required), `missing trusted-classifier boundary: ${required}`);
  }

  assert.doesNotMatch(
    workflow,
    /classification="\$\(printf '%s\\n' "\$changed_paths" \| node scripts\/classify-production-impact\.mjs\)"/u,
  );
});

test('production verification job remains fail-closed on dependency drift but stops when superseded', () => {
  assert.match(
    workflow,
    /if: \$\{\{ !cancelled\(\) && \(github\.event_name == 'workflow_dispatch' \|\| needs\.classify-production-impact\.result != 'success' \|\| needs\.classify-production-impact\.outputs\.production_impact != 'false'\) \}\}/u,
  );
  assert.doesNotMatch(
    workflow,
    /verify-native-deployment:[\s\S]*?if: \$\{\{ always\(\)/u,
    'the Production job must not use always() because cancelled superseded runs must terminate active witnesses',
  );
});

test('production verification preserves independent evidence after current-main trust while keeping release identity load-bearing', () => {
  const schema = workflowStepBlock('Verify exact Supabase production schema contract');
  const transport = workflowStepBlock('Record safe frontend and backend transport evidence');
  const backend = workflowStepBlock('Verify backend health');
  const supabaseHealth = workflowStepBlock('Verify Supabase runtime contracts');
  const chromium = workflowStepBlock('Install Chromium');
  const browserObservation = workflowStepBlock('Observe public production browser journeys independently');
  const cloudflare = workflowStepBlock('Wait for exact frontend and backend Worker checks plus release marker');
  const releaseIdentity = workflowStepBlock('Verify exact deployed release identity with Playwright');

  for (const block of [schema, transport, backend, supabaseHealth, chromium]) {
    assert.match(
      block,
      /if: \$\{\{ !cancelled\(\) && steps\.trusted_current_main\.outcome == 'success' \}\}/u,
      'independent proof planes must continue observing after exact-current-main trust is established',
    );
  }

  assert.match(
    browserObservation,
    /if: \$\{\{ !cancelled\(\) && steps\.chromium\.outcome == 'success' \}\}/u,
    'public browser observation must remain independent of Cloudflare release convergence',
  );
  assert.doesNotMatch(browserObservation, /steps\.cloudflare_release\.outcome/u);

  assert.match(
    cloudflare,
    /if: \$\{\{ !cancelled\(\) && steps\.trusted_current_main\.outcome == 'success' && steps\.release_transport\.outcome == 'success' \}\}/u,
    'Cloudflare convergence requires trusted current main and safe release transport without suppressing sibling proof planes',
  );
  assert.doesNotMatch(cloudflare, /steps\.supabase_schema\.outcome|steps\.backend_health\.outcome|steps\.supabase_health\.outcome/u);

  assert.match(
    releaseIdentity,
    /if: \$\{\{ !cancelled\(\) && steps\.chromium\.outcome == 'success' && steps\.cloudflare_release\.outcome == 'success' \}\}/u,
    'exact release identity Playwright remains load-bearing on both browser availability and Cloudflare release convergence',
  );

  for (const [name, block] of [
    ['schema', schema],
    ['transport', transport],
    ['backend', backend],
    ['supabase runtime', supabaseHealth],
    ['chromium', chromium],
    ['browser observation', browserObservation],
    ['cloudflare', cloudflare],
    ['release identity', releaseIdentity],
  ]) {
    assert.doesNotMatch(block, /continue-on-error:\s*true/u, `${name} must remain load-bearing`);
  }

  assert.match(
    workflow,
    /- name: Publish exact production release observation\n\s+if: success\(\)/u,
    'verified release publication must still require every required witness to pass',
  );
  assert.match(
    workflow,
    /- name: Publish blocked exact production observation\n\s+if: failure\(\)/u,
    'a failed proof plane must still produce a blocked release observation',
  );
});

test('all production steps are bounded with reserved time for evidence publication', () => {
  const jobTimeoutMinutes = 180;
  assert.match(
    workflow,
    /verify-native-deployment:[\s\S]*?timeout-minutes: 180/u,
    'the job budget must leave explicit headroom after every bounded step',
  );

  const stepBudgets = new Map([
    ['Validate trusted release target before checkout', 5],
    ['Check out release commit under verification', 5],
    ['Record and verify exact target head', 2],
    ['Set up Node', 5],
    ['Install repository dependencies', 10],
    ['Revalidate current main before Production secret use', 5],
    ['Verify exact Supabase production schema contract', 5],
    ['Record safe frontend and backend transport evidence', 5],
    ['Verify backend health', 5],
    ['Verify Supabase runtime contracts', 5],
    ['Install Chromium', 15],
    ['Observe public production browser journeys independently', 30],
    ['Wait for exact frontend and backend Worker checks plus release marker', 35],
    ['Verify exact deployed release identity with Playwright', 10],
    ['Upload deployment evidence', 5],
    ['Publish exact production release observation', 5],
    ['Publish blocked exact production observation', 5],
  ]);

  let boundedMinutes = 0;
  for (const [name, minutes] of stepBudgets) {
    const block = workflowStepBlock(name);
    assert.match(block, new RegExp(`timeout-minutes: ${minutes}\\b`, 'u'), `${name} must have a bounded timeout`);
    boundedMinutes += minutes;
  }

  assert.ok(
    jobTimeoutMinutes - boundedMinutes >= 20,
    'job timeout must reserve at least 20 minutes beyond the sum of every bounded setup, witness, evidence, and publication step',
  );
});

test('durable docs and test-only changes can preserve release identity when positively classified', () => {
  const result = classifyProductionImpact([
    'docs/TRUTH_AUTHORITY.md',
    'test/deploy-cloudflare-workflow-contract.test.mjs',
  ]);

  assert.equal(result.productionImpact, false);
  assert.equal(result.reason, 'verified-non-production-only');
});

test('retired Sandbox paths are no longer silently allowlisted', () => {
  for (const path of [
    '.github/workflows/cloudflare-sandbox-exact-head.yml',
    'tools/cloudflare-sandbox/src/index.ts',
  ]) {
    const result = classifyProductionImpact([path]);
    assert.equal(result.productionImpact, true, `${path} must fail closed after Sandbox retirement`);
  }
});

test('build inputs and unknown paths fail closed as production-impacting', () => {
  for (const path of [
    '.node-version',
    '.npmrc',
    '.env.production',
    'babel.config.js',
    'metro.config.js',
    'tsconfig.json',
    'scripts/playwright-executable.mjs',
    'supabase/migrations/20260820190000_example.sql',
    'hooks/useSession.ts',
    'utils/runtime.ts',
    'public/icon.png',
    'future-runtime/new-entry.ts',
  ]) {
    const result = classifyProductionImpact([path]);
    assert.equal(result.productionImpact, true, `${path} must fail closed as production-impacting`);
  }
});

test('mixed changes are production-impacting even when most paths are documentation or tests', () => {
  const result = classifyProductionImpact([
    'docs/CURRENT_STATUS.md',
    'test/some-contract.test.mjs',
    'worker/voice-entry.ts',
  ]);

  assert.equal(result.productionImpact, true);
  assert.deepEqual(result.productionPaths, ['worker/voice-entry.ts']);
});

test('empty or malformed path evidence fails closed', () => {
  assert.equal(classifyProductionImpact([]).productionImpact, true);
  assert.equal(classifyProductionImpact(['../worker/voice-entry.ts']).productionImpact, true);
  assert.equal(classifyProductionImpact(['C:\\worker\\voice-entry.ts']).productionImpact, true);
});

test('classifier CLI works when invoked through a relative script path', () => {
  const nonProduction = spawnSync(process.execPath, ['scripts/classify-production-impact.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: 'docs/CURRENT_STATUS.md\ntest/example.test.mjs\n',
  });
  assert.equal(nonProduction.status, 0, nonProduction.stderr);
  assert.equal(nonProduction.stdout.trim(), 'false');

  const production = spawnSync(process.execPath, ['scripts/classify-production-impact.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: '.node-version\n',
  });
  assert.equal(production.status, 0, production.stderr);
  assert.equal(production.stdout.trim(), 'true');
});
