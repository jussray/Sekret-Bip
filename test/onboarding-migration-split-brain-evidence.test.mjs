import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = async (path) => {
  try {
    await read(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const livePath = 'docs/migration-history/onboarding/20260718040638_onboarding_state.live.sql';
const repoStatePath = 'docs/migration-history/onboarding/20260718000000_onboarding_state.repository.sql';
const repoMoodPath = 'docs/migration-history/onboarding/20260718000001_onboarding_mood_log_trigger.repository.sql';
const observationPath = 'docs/migration-history/onboarding/production-observation-2026-07-18.json';
const canonicalPath = 'supabase/migrations/20260718040638_onboarding_state.sql';
const enumExtensionPath = 'supabase/migrations/20260811132500_extend_onboarding_stage_enum.sql';
const reconcilePath = 'supabase/migrations/20260811132600_reconcile_onboarding_and_moods_contract.sql';

const oldExecutablePaths = [
  'supabase/migrations/20260718000000_onboarding_state.sql',
  'supabase/migrations/20260718000001_onboarding_mood_log_trigger.sql',
  'supabase/migrations/20260718000002_harden_onboarding_state.sql',
];

test('historical repository split-brain evidence remains inert and preserved', async () => {
  const [repositoryState, repositoryMood] = await Promise.all([
    read(repoStatePath),
    read(repoMoodPath),
  ]);

  assert.match(repositoryState, /'signed_up'/);
  assert.match(repositoryState, /age_bucket/);
  assert.match(repositoryMood, /handle_first_mood_log/);

  for (const path of oldExecutablePaths) {
    assert.equal(await exists(path), false, `${path} must stay out of ordered migrations`);
  }
});

test('ordered migration authority now uses recorded baseline plus current reconciliation', async () => {
  const [canonical, enumExtension, reconcile] = await Promise.all([
    read(canonicalPath),
    read(enumExtensionPath),
    read(reconcilePath),
  ]);

  assert.match(canonical, /CREATE TYPE public\.onboarding_stage AS ENUM/);
  assert.match(canonical, /'signup'/);
  assert.match(canonical, /'offboarded'/);
  assert.doesNotMatch(canonical, /'signed_up'/);

  for (const stage of [
    'pre_signup', 'signed_up', 'age_verified', 'role_selected',
    'parent_link_sent', 'parent_linked', 'steady_state',
  ]) {
    assert.match(enumExtension, new RegExp(`'${stage}'`));
  }

  assert.match(reconcile, /requires manual review for offboarded rows/);
  assert.match(reconcile, /when 'signup' then 'signed_up'/);
  assert.match(reconcile, /when 'age_confirmed' then 'age_verified'/);
  assert.match(reconcile, /when 'parent_link_complete' then 'parent_linked'/);
  assert.match(reconcile, /add column if not exists age_bucket text/);
  assert.match(reconcile, /add column if not exists parent_link_code text/);
  assert.match(reconcile, /create table if not exists public\.moods/);
  assert.match(reconcile, /create trigger trg_first_mood_activation/);
});

test('live baseline evidence preserves the observed remote contract', async () => {
  const live = await read(livePath);

  for (const stage of [
    'signup',
    'welcome_seen',
    'consent_complete',
    'age_confirmed',
    'parent_link_complete',
    'activated',
    'offboarded',
  ]) {
    assert.ok(live.includes(`'${stage}'`), `missing live stage ${stage}`);
  }

  assert.match(live, /user_id\s+uuid PRIMARY KEY/);
  assert.match(live, /FOR ALL USING \(auth\.uid\(\) = user_id\)/);
  assert.match(live, /CREATE OR REPLACE FUNCTION public\.uos_set_updated_at/);
  assert.doesNotMatch(live, /age_bucket|parent_link_sent|steady_state|handle_first_mood_log/);
});

test('historical evidence document remains fail-closed about unsafe legacy mapping', async () => {
  const doc = await read('docs/ONBOARDING_MIGRATION_RECONCILIATION.md');

  assert.match(doc, /evidence and planning only/);
  assert.match(doc, /All SQL under `docs\/migration-history\/onboarding\/` is inert historical evidence/);
  assert.match(doc, /`offboarded` \| none \| must fail\/manual review/);
});

test('read-only parity probe contains no mutation statements', async () => {
  const probe = await read('supabase/probes/onboarding_migration_split_brain.sql');

  assert.match(probe, /^begin transaction read only;/m);
  assert.match(probe, /^rollback;/m);
  assert.match(probe, /Aggregate-only row witnesses/);
  assert.doesNotMatch(probe, /^\s*(insert|update|delete|alter|create|drop|grant|revoke|truncate)\b/gim);
  assert.doesNotMatch(probe, /select\s+\*/i);
});

test('retained production observation stays aggregate-only historical evidence', async () => {
  const observation = JSON.parse(await read(observationPath));

  assert.equal(observation.observationMode, 'read_only_catalog_and_aggregate');
  assert.equal(observation.migrationHistory.liveVersion, '20260718040638');
  assert.deepEqual(observation.migrationHistory.repositoryVersionsAbsentLive, [
    '20260718000000',
    '20260718000001',
  ]);
  assert.equal(observation.aggregateState.onboardingRows, 0);
  assert.equal(observation.aggregateState.moodRows, 0);
  assert.equal(observation.privacy.identifiersRetrieved, false);
  assert.equal(observation.privacy.rowContentRetrieved, false);
  assert.equal(observation.mutation.ddlExecuted, false);
  assert.equal(observation.mutation.dmlExecuted, false);
  assert.equal(observation.decision, 'hold_for_development_branch_reconciliation');
});

test('archived live and repository contracts remain intentionally distinct evidence', async () => {
  const [live, repository] = await Promise.all([
    read(livePath),
    read(repoStatePath),
  ]);

  assert.notEqual(live, repository);
  assert.match(live, /'signup'/);
  assert.doesNotMatch(live, /'signed_up'/);
  assert.match(repository, /'signed_up'/);
  assert.doesNotMatch(repository, /'signup'/);
  assert.match(repository, /age_bucket/);
  assert.doesNotMatch(live, /age_bucket/);
});

test('all retained historical evidence stays outside the ordered migration directory', async () => {
  for (const path of [livePath, repoStatePath, repoMoodPath, observationPath]) {
    assert.ok(path.startsWith('docs/migration-history/onboarding/'));
    assert.ok(!path.startsWith('supabase/migrations/'));
  }
});
