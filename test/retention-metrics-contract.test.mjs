import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('D7 retention is anchored to each user first session and a complete D6-D8 window', async () => {
  const migration = await read('supabase/migrations/20260919191500_fix_d7_retention_first_session.sql');

  assert.match(migration, /min\(created_at::date\) as first_day/i);
  assert.match(migration, /where event_type = 'session_start'[\s\S]*user_id is not null/i);
  assert.match(migration, /first_day <= current_date - 8/i);
  assert.match(migration, /select distinct cohort\.user_id/i);
  assert.match(migration, /between cohort\.first_day \+ 6 and cohort\.first_day \+ 8/i);
  assert.match(migration, /count\(returned_users\.user_id\)::float[\s\S]*count\(eligible_cohort\.user_id\)/i);
  assert.doesNotMatch(migration, /select distinct user_id, date\(created_at\) as day0/i);
});

test('retention event source uses authenticated account identity and server timestamp', async () => {
  const logger = await read('src/services/logEvent.ts');
  const teenLayout = await read('app/(teen)/_layout.tsx');

  assert.match(logger, /supabase\.auth\.getUser\(\)/);
  assert.match(logger, /if \(!user\)[\s\S]*reason: 'unauthenticated'/);
  assert.match(logger, /user_id: user\.id/);
  assert.match(logger, /event_type/);
  assert.doesNotMatch(logger, /created_at\s*:/);
  assert.match(teenLayout, /logEvent\('session_start'\)/);
});

test('D7 and WAU analytics remain service-only instead of becoming teen-facing surveillance data', async () => {
  const foundation = await read('supabase/migrations/20260705_app_events.sql');
  const correction = await read('supabase/migrations/20260919191500_fix_d7_retention_first_session.sql');

  assert.match(foundation, /revoke all on public\.v_d7_retention from public, anon, authenticated/i);
  assert.match(foundation, /grant select on public\.v_wau_trend to service_role/i);
  assert.match(correction, /revoke all on public\.v_d7_retention from public, anon, authenticated/i);
  assert.match(correction, /grant select on public\.v_d7_retention to service_role/i);
});
