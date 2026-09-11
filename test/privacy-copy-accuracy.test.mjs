import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname).replace(/\/test$/, '');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('cycle calendar describes account sync without device-only or sole-reader promises', () => {
  const screen = read('screens/PeriodCalendarScreen.tsx');

  // The calendar is local-first, but it also reads and writes cloud rows.
  assert.match(screen, /loadPeriodDays\(\)/);
  assert.match(screen, /syncPeriodDay\(isoDay\)/);
  assert.match(screen, /deletePeriodDay\(isoDay\)/);

  // Teen-facing copy must describe that sync plainly.
  assert.match(screen, /cycle days sync to your account/i);
  assert.match(screen, /Parent Pages/i);

  // These absolutes conflict with the implemented storage path or operator access.
  assert.doesNotMatch(screen, /your data stays on this device/i);
  assert.doesNotMatch(screen, /nothing leaves/i);
  assert.doesNotMatch(screen, /only you see this/i);
  assert.doesNotMatch(screen, /private · on-device/i);
  assert.doesNotMatch(screen, /only your login opens/i);
});

test('period-day RLS remains owner-scoped and has no parent policy', () => {
  const ownerPolicy = read('supabase/migrations/20260629024952_block_anonymous_sessions_from_private_data.sql');
  assert.match(
    ownerPolicy,
    /alter policy period_days_owner_select on public\.period_days using \(public\.is_non_anonymous_user\(\) and auth\.uid\(\) = user_id\)/,
  );

  const migrationsDir = path.join(root, 'supabase/migrations');
  const statements = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .flatMap((name) => read(path.join('supabase/migrations', name)).split(';'));

  const parentPeriodPolicies = statements.filter((statement) =>
    /\b(?:create|alter)\s+policy\b/i.test(statement) &&
    /\bperiod_days\b/i.test(statement) &&
    /\bparent\b/i.test(statement)
  );

  assert.deepEqual(
    parentPeriodPolicies,
    [],
    'A parent policy on period_days would require revisiting the teen-facing privacy copy.',
  );
});
