import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260713230600_harden_private_self_data_permanent_accounts.sql',
);
const staleMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20260713231500_harden_private_self_data_permanent_accounts.sql',
);
const probePath = path.join(
  root,
  'supabase',
  'probes',
  'authorization_private_self_data_phase1.sql',
);
const evidencePath = path.join(
  root,
  'security',
  'private-self-data-hardening.json',
);

const migration = fs.readFileSync(migrationPath, 'utf8');
const probe = fs.readFileSync(probePath, 'utf8');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

test('repository migration matches the live Supabase version', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  assert.equal(fs.existsSync(staleMigrationPath), false);
  assert.equal(evidence.migration.version, '20260713230600');
  assert.equal(evidence.migration.name, 'harden_private_self_data_permanent_accounts');
  assert.equal(
    evidence.migration.repositoryPath,
    'supabase/migrations/20260713230600_harden_private_self_data_permanent_accounts.sql',
  );
  assert.equal(evidence.migration.applied, true);
  assert.equal(evidence.migration.verified, true);
  assert.equal(evidence.migration.repositoryAndLiveMigrationParity, true);
});

test('comfort and room memory require permanent-account ownership', () => {
  for (const table of ['comfort_sessions', 'room_memory']) {
    assert.match(
      migration,
      new RegExp(`create policy ${table}_permanent_owner_all[\\s\\S]*?to authenticated`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`${table}_permanent_owner_all[\\s\\S]*?public\\.is_non_anonymous_user\\(\\)`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`${table}_permanent_owner_all[\\s\\S]*?auth\\.uid\\(\\)[\\s\\S]*?user_id`, 'i'),
    );
  }

  assert.equal(evidence.policies.ownerCheck, true);
  assert.equal(evidence.policies.permanentAccountGuard, 'public.is_non_anonymous_user()');
  assert.equal(evidence.policies.legacyOverlappingPoliciesRemoved, true);
});

test('client table grants are reduced to permanent-account CRUD', () => {
  for (const table of ['comfort_sessions', 'room_memory']) {
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated;`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated;`, 'i'),
    );
  }

  assert.equal(evidence.grants.anonTablePrivileges, false);
  assert.equal(evidence.grants.authenticatedCrudOnly, true);
  assert.equal(evidence.grants.authenticatedTruncate, false);
  assert.equal(evidence.grants.authenticatedReferences, false);
  assert.equal(evidence.grants.authenticatedTrigger, false);
  assert.equal(evidence.grants.serviceRoleChanged, false);
});

test('legacy overlapping owner policies are removed', () => {
  for (const prefix of ['comfort_sessions', 'room_memory']) {
    for (const suffix of ['owner_delete', 'owner_insert', 'owner_select', 'owner_update', 'self']) {
      assert.match(
        migration,
        new RegExp(`drop policy if exists ${prefix}_${suffix} on public\\.${prefix};`, 'i'),
      );
    }
  }
});

test('live proof is rollback-contained and privacy-safe', () => {
  assert.match(probe, /^-- Se'kret Bip private self-data authorization Phase 1 proof harness/m);
  assert.match(probe, /\bbegin;/i);
  assert.match(probe, /\brollback;\s*$/i);
  assert.doesNotMatch(probe, /\bcommit;/i);
  assert.doesNotMatch(probe, /insert\s+into\s+auth\.users/i);
  assert.doesNotMatch(probe, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);

  assert.equal(evidence.liveProof.transactionOutcome, 'rolled_back');
  assert.equal(evidence.liveProof.passedChecks, 7);
  assert.equal(evidence.liveProof.failedChecks, 0);
  assert.equal(evidence.liveProof.syntheticUsersCreated, 0);
  assert.equal(evidence.liveProof.productionDataRetained, false);
  assert.equal(evidence.liveProof.userIdsOrPrivateContentReturned, false);
});

test('proof covers denied anonymous writes and preserved permanent owner writes', () => {
  for (const check of [
    'anonymous_comfort_write_denied',
    'anonymous_room_memory_write_denied',
    'permanent_comfort_owner_write_allowed',
    'permanent_room_memory_owner_write_allowed',
    'comfort_table_grants_least_privilege',
    'room_memory_table_grants_least_privilege',
    'single_policy_contract_installed',
  ]) {
    assert.match(probe, new RegExp(check));
  }

  assert.match(probe, /'is_anonymous', true/i);
  assert.match(probe, /'is_anonymous', false/i);
  assert.match(probe, /exception when insufficient_privilege/i);

  for (const passed of Object.values(evidence.checks)) {
    assert.equal(passed, true);
  }
});

test('advisor warning is classified rather than misreported as cleared', () => {
  assert.equal(evidence.advisor.rerunCompleted, true);
  assert.equal(evidence.advisor.staticAnonymousRoleWarningsRemain, true);
  assert.match(evidence.advisor.reason, /does not evaluate the explicit is_non_anonymous_user/i);
});

test('evidence contains no secrets or personal addresses', () => {
  const raw = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(raw, /service[_-]?role[_-]?key\s*[:=]/i);
  assert.doesNotMatch(raw, /sk-[a-z0-9_-]{10,}/i);
  assert.doesNotMatch(raw, /@[a-z0-9.-]+\.(com|net|org|edu)\b/i);
});
