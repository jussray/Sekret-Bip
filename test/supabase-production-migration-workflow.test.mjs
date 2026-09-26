import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const WORKFLOW_PATH = '.github/workflows/deploy-supabase-migrations.yml';
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const CHECKOUT_SHA = '11d5960a326750d5838078e36cf38b85af677262';
const UPLOAD_ARTIFACT_SHA = 'ea165f8d65b6e75b540449e92b4886f43607fa02';
const SUPABASE_SETUP_SHA = 'ab058987d8d6c725971f6cf9d0b5c98467e30bd1';

function indexOfRequired(fragment) {
  const index = workflow.indexOf(fragment);
  assert.notEqual(index, -1, `Expected workflow to contain: ${fragment}`);
  return index;
}

function stepBlock(name, nextName) {
  const start = indexOfRequired(`- name: ${name}`);
  const end = nextName ? indexOfRequired(`- name: ${nextName}`) : workflow.length;
  assert.ok(start < end, `${name} must appear before ${nextName ?? 'workflow end'}.`);
  return workflow.slice(start, end);
}

test('production migration workflow is manual, dry-run by default, and has no history-repair mode', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n  push:/);
  assert.doesNotMatch(workflow, /\n  pull_request:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /mode:[\s\S]*?default: dry-run/);
  assert.match(workflow, /options:\s*\n\s*- dry-run\s*\n\s*- apply/);
  assert.doesNotMatch(workflow, /normalize-alias|migration repair|canonical_version|execution_version|normalize_confirmation/i);
  assert.match(workflow, /confirm_project:/);
  assert.match(workflow, /apply_confirmation:/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('production migration workflow pins project, CLI, and third-party actions', () => {
  assert.match(workflow, /SUPABASE_PROJECT_REF: tbsevonvegdnlyjgplmm/);
  assert.match(workflow, new RegExp(`uses: actions/checkout@${CHECKOUT_SHA}`));
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, new RegExp(`uses: supabase/setup-cli@${SUPABASE_SETUP_SHA}[\\s\\S]*?version: 2\\.113\\.0`));
  assert.match(workflow, new RegExp(`uses: actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.doesNotMatch(workflow, /(?:actions\/checkout|actions\/upload-artifact|supabase\/setup-cli)@v\d+/);
});

test('production credentials are step-scoped and never attached to checkout or artifact upload', () => {
  const workflowEnv = workflow.match(/\nenv:\n([\s\S]*?)\n\nconcurrency:/)?.[1] ?? '';
  assert.doesNotMatch(workflowEnv, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD/);

  const setupCli = stepBlock('Set up Supabase CLI', 'Verify production credentials');
  assert.doesNotMatch(setupCli, /secrets\.SUPABASE_ACCESS_TOKEN|secrets\.SUPABASE_DB_PASSWORD/);

  for (const [name, nextName] of [
    ['Verify production credentials', 'Link exact production project'],
    ['Link exact production project', 'Preview production migration plan'],
    ['Preview production migration plan', 'Verify production schema before mutation'],
    ['Apply production migrations', 'Verify exact production schema after mutation'],
  ]) {
    const block = stepBlock(name, nextName);
    assert.match(block, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
    assert.match(block, /SUPABASE_DB_PASSWORD: \$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  }

  for (const [name, nextName] of [
    ['Verify production schema before mutation', 'Re-verify current main immediately before mutation'],
    ['Verify exact production schema after mutation', 'Retain migration evidence'],
  ]) {
    const witness = stepBlock(name, nextName);
    assert.match(witness, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
    assert.doesNotMatch(witness, /SUPABASE_DB_PASSWORD/);
  }

  const upload = stepBlock('Retain migration evidence');
  assert.doesNotMatch(upload, /secrets\.SUPABASE_ACCESS_TOKEN|secrets\.SUPABASE_DB_PASSWORD/);
});

test('apply is explicit, exact-current-main, dry-run-first, and post-verified', () => {
  assert.match(workflow, /test "\$APPLY_CONFIRMATION" = 'APPLY PRODUCTION MIGRATIONS'/);
  assert.match(workflow, /test "\$CONFIRM_PROJECT" = "\$SUPABASE_PROJECT_REF"/);

  const initialAuthority = indexOfRequired('- name: Verify exact target is current main');
  const dryRun = indexOfRequired('supabase db push --linked --dry-run 2>&1 | tee artifacts/supabase-db-push-dry-run.txt');
  const preWitness = indexOfRequired('- name: Verify production schema before mutation');
  const recheck = indexOfRequired('- name: Re-verify current main immediately before mutation');
  const apply = indexOfRequired('supabase db push --linked 2>&1 | tee artifacts/supabase-db-push-apply.txt');
  const postWitness = indexOfRequired('- name: Verify exact production schema after mutation');

  assert.ok(initialAuthority < dryRun);
  assert.ok(dryRun < preWitness);
  assert.ok(preWitness < recheck);
  assert.ok(recheck < apply);
  assert.ok(apply < postWitness);

  const mainFetches = workflow.match(/git fetch --no-tags --depth=1 origin main/g) ?? [];
  assert.equal(mainFetches.length, 2, 'Current main must be checked before provider evaluation and again immediately before mutation.');
  assert.match(workflow, /Refusing to evaluate production migrations from a SHA that is no longer current main\./);
  assert.match(workflow, /Main advanced after pre-mutation proof; refusing production migration mutation\./);
});

test('routine workflow cannot perform migration-history surgery through alternate commands', () => {
  assert.doesNotMatch(workflow, /migration repair|repair_version|normalize-alias|--include-all|--include-seed|psql\s|execute_sql|apply_migration/i);
});

test('migration evidence is retained without weakening failed runs', () => {
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /artifacts\/supabase-db-push-dry-run\.txt/);
  assert.match(workflow, /artifacts\/supabase-db-push-apply\.txt/);
  assert.match(workflow, /artifacts\/supabase-production-schema\.json/);
  assert.doesNotMatch(workflow, /supabase-migration-(?:list|normalize)/);
});
