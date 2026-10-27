import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260901000500_create_private_reopen_reminders.sql'),
  'utf8',
);
const repository = fs.readFileSync(
  path.join(root, 'src/features/reminders/privateReopenRemindersRepository.ts'),
  'utf8',
);

const migrationSql = migration.replace(/--.*$/gm, '');
const repositoryCode = repository.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

test('reopen reminders are owner-only permanent-account data', () => {
  assert.match(migration, /alter table public\.private_reopen_reminders enable row level security/);
  assert.match(migration, /revoke all on table public\.private_reopen_reminders from anon/);
  assert.match(migration, /create policy private_reopen_reminders_select_own[\s\S]*auth\.uid\(\)[\s\S]*user_id[\s\S]*is_anonymous/);
  assert.doesNotMatch(migrationSql, /parent_links|guardian/i);
});

test('reminders stay outside chore, reward, approval, and social semantics', () => {
  assert.match(migration, /Never parent-visible, social, rewarded, or approval-based/);
  assert.doesNotMatch(migrationSql, /point_value|reward_|task_submission|circle_post/i);
  assert.doesNotMatch(repositoryCode, /pointTransactions|parentLinks|circlePosts|submit_bip_task|review_task_submission/i);
});

test('repository is local-first and account-scoped', () => {
  assert.match(repository, /CACHE_PREFIX = 'sekretbip:reopen-reminders:v1'/);
  assert.match(repository, /cacheKey\(owner: string\)/);
  assert.match(repository, /await writeLocal\(owner, next\)/);
  assert.match(repository, /syncLocalPending\(owner, next\)/);
});

test('only due pending reminders surface on reopen', () => {
  assert.match(repository, /\.eq\('status', 'pending'\)/);
  assert.match(repository, /\.lte\('surface_after', now\)/);
  assert.match(repository, /item\.status === 'pending' && item\.surfaceAfter <= now/);
});

test('reminder labels are bounded and do not create analytics receipts', () => {
  assert.match(migration, /char_length\(trim\(label\)\) between 1 and 160/);
  assert.match(repository, /label\.trim\(\)\.slice\(0, 160\)/);
  assert.doesNotMatch(repositoryCode, /logEvent|bip_events|analytics\./i);
});
