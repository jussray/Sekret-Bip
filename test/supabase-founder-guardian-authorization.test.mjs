import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const helperMigrationPath = path.join(
  migrationsDir,
  '20260713024231_harden_founder_helper_anonymous_guard.sql',
);
const policyMigrationPath = path.join(
  migrationsDir,
  '20260713024245_harden_audit_control_room_policies.sql',
);
const grantMigrationPath = path.join(
  migrationsDir,
  '20260713024253_remove_anon_audit_control_room_grants.sql',
);
const obsoleteCombinedMigrationPath = path.join(
  migrationsDir,
  '20260713023500_harden_founder_guardian_authorization.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_founder_guardian_phase1.sql',
);

const helperMigration = fs.readFileSync(helperMigrationPath, 'utf8');
const policyMigration = fs.readFileSync(policyMigrationPath, 'utf8');
const grantMigration = fs.readFileSync(grantMigrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');

const controlRoomTables = [
  'control_room_fingerprints',
  'control_room_issue_events',
  'control_room_issue_history',
  'control_room_issues',
  'control_room_releases',
];

test('repository migration history matches the three exact live migration versions', () => {
  assert.equal(fs.existsSync(helperMigrationPath), true);
  assert.equal(fs.existsSync(policyMigrationPath), true);
  assert.equal(fs.existsSync(grantMigrationPath), true);
  assert.equal(fs.existsSync(obsoleteCombinedMigrationPath), false);
});

test('founder helper rejects anonymous-authenticated sessions and has a fixed search path', () => {
  assert.match(helperMigration, /create or replace function public\.is_founder\(\)/i);
  assert.match(helperMigration, /security definer/i);
  assert.match(helperMigration, /set search_path = public, auth/i);
  assert.match(
    helperMigration,
    /coalesce\(\(\(select auth\.jwt\(\)\) ->> 'is_anonymous'\)::boolean, false\) = false/i,
  );
  assert.match(helperMigration, /p\.user_id = \(select auth\.uid\(\)\)/i);
});

test('founder helper execute grants are explicit', () => {
  assert.match(helperMigration, /revoke all on function public\.is_founder\(\) from public;/i);
  assert.match(helperMigration, /revoke all on function public\.is_founder\(\) from anon;/i);
  assert.match(
    helperMigration,
    /grant execute on function public\.is_founder\(\) to authenticated, service_role;/i,
  );
});

test('unauthenticated anon table privileges are removed from audit and Control Room tables', () => {
  assert.match(grantMigration, /revoke all privileges on table public\.audit_events from anon;/i);
  for (const table of controlRoomTables) {
    assert.match(
      grantMigration,
      new RegExp(`revoke all privileges on table public\\.${table} from anon;`, 'i'),
    );
  }
  assert.doesNotMatch(grantMigration, /\bgrant\b/i);
});

test('direct audit policies reject anonymous sessions', () => {
  for (const policy of [
    'audit_events_insert_authenticated',
    'audit_events_select_founder',
    'audit_events_update_founder',
    'audit_events_delete_founder',
  ]) {
    assert.match(policyMigration, new RegExp(`create policy ${policy}`, 'i'));
  }

  const anonymousChecks = policyMigration.match(/is_anonymous'\)::boolean, false\) = false/gi) ?? [];
  assert.ok(anonymousChecks.length >= 4, 'expected an anonymous-session guard on every audit policy');
});

test('Control Room policies target authenticated callers rather than PUBLIC', () => {
  for (const policy of [
    'registry_access',
    'control_room_issue_events_founder',
    'issue_history_founder',
    'control_room_issues_founder',
  ]) {
    assert.match(
      policyMigration,
      new RegExp(`create policy ${policy}[\\s\\S]*?to authenticated[\\s\\S]*?public\\.is_founder\\(\\)`, 'i'),
    );
  }
  assert.match(
    policyMigration,
    /create policy "Founder: releases"[\s\S]*?to authenticated[\s\S]*?public\.is_founder\(\)/i,
  );
  assert.doesNotMatch(policyMigration, /create policy[\s\S]{0,180}\bto public\b/i);
});

test('Phase 1 probe is rollback-contained and does not manufacture auth users', () => {
  assert.match(probe, /^-- Se'kret Bip founder\/guardian authorization Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.doesNotMatch(probe, /insert\s+into\s+auth\.users/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});

test('Phase 1 probe covers normal, founder, anonymous-founder, guardian, and grant boundaries', () => {
  for (const check of [
    'normal_is_not_founder',
    'normal_guardian_queue_denied',
    'normal_guardian_review_denied',
    'normal_control_room_upsert_denied',
    'founder_is_founder',
    'founder_can_manage_guardian_reviews',
    'founder_review_reaches_target_validation',
    'founder_control_room_upsert_succeeds',
    'anonymous_founder_rejected_by_founder_helper',
    'anonymous_founder_rejected_by_guardian_helper',
    'anonymous_control_room_upsert_denied',
    'anonymous_audit_insert_denied',
    'anon_table_grants_removed',
    'founder_helper_execute_grants_are_explicit',
  ]) {
    assert.match(probe, new RegExp(check));
  }
});
