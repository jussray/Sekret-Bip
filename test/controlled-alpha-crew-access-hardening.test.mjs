import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const accessMigrationPath = 'supabase/migrations/20260718035000_deny_blocked_crew_access.sql';
const probePath = 'supabase/probes/controlled_alpha_relationship_contract_v2.sql';

test('private Crew access helper is bound to the current permanent member', async () => {
  const migration = await read(accessMigrationPath);

  assert.match(migration, /\(select auth\.uid\(\)\) is not null/);
  assert.match(migration, /\(select auth\.uid\(\)\) = p_member_user_id/);
  assert.match(migration, /auth\.jwt\(\) ->> 'is_anonymous'/);
  assert.match(migration, /accepted\.connection_status = 'accepted'/);
  assert.match(migration, /blocked\.connection_status = 'blocked'/);
});

test('former or blocked Crew members lose encouragement reads while the owner retains history', async () => {
  const migration = await read(accessMigrationPath);
  const readPolicy = migration.slice(
    migration.indexOf('drop policy if exists crew_encouragements_read'),
    migration.indexOf('drop policy if exists crew_encouragements_sender_insert'),
  );

  assert.match(readPolicy, /create policy crew_encouragements_read/);
  assert.match(readPolicy, /\(select auth\.uid\(\)\) = recipient_user_id/);
  assert.match(readPolicy, /\(select auth\.uid\(\)\) = sender_user_id/);
  assert.match(readPolicy, /private\.crew_check_in_access_is_active/);
  assert.doesNotMatch(readPolicy, /from public\.crew_check_in_shares/);
});

test('v2 relationship catalog probe is metadata-only and checks caller binding plus four Crew policies', async () => {
  const probe = await read(probePath);

  assert.match(probe, /replace\(setting, ' ', ''\) = 'search_path=public,pg_temp'/);
  assert.match(probe, /auth\.uid\(\).*p_member_user_id/s);
  assert.match(probe, /is_anonymous/);
  assert.match(probe, /count\(\*\) = 4/);
  assert.match(probe, /crew_encouragements_read/);
  assert.match(probe, /rollback;\s*$/);
  assert.doesNotMatch(probe, /insert into public\./);
  assert.doesNotMatch(probe, /update public\./);
  assert.doesNotMatch(probe, /delete from public\./);
});
