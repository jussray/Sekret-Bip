import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Crew has no numeric member or share cap', () => {
  const legacyEntry = read('screens/BipCrewScreen.tsx');
  const legacyScreen = read('screens/BipCrewScreenV2.tsx');
  const serviceEntry = read('src/services/crewAccountabilityService.ts');
  const service = read('src/services/crewAccountabilityServiceV2.ts');
  const capMigration = read('supabase/migrations/20260714183100_remove_crew_caps_and_guard_relationships.sql');

  assert.match(legacyEntry, /BipCrewScreenV2/);
  assert.doesNotMatch(legacyScreen, /MAX_CREW|2–6|2-6|length\s*>?=\s*6/);
  assert.match(legacyScreen, /There is no member limit/);
  assert.match(serviceEntry, /crewAccountabilityServiceV2/);
  assert.doesNotMatch(service, /MAX_SHARES|at most .* crew members/);
  assert.match(service, /rpc\('create_crew_check_in'/);
  assert.match(capMigration, /drop trigger if exists trg_circle_members_limit/);
  assert.match(capMigration, /drop function if exists public\.enforce_crew_member_limit/);
  assert.match(capMigration, /drop constraint if exists crews_max_members_check/);
  assert.match(capMigration, /set max_members = null/);
});

test('accounts stay anonymous until an accepted Crew relationship exists', () => {
  const identityMigration = read('supabase/migrations/20260714183300_accepted_crew_identity_rpc.sql');
  const repository = read('src/services/crewRelationshipRepository.ts');
  const manager = read('screens/BipCrewScreenV2.tsx');
  const accountability = read('src/screens/CrewAccountabilityScreenV3.tsx');

  assert.match(identityMigration, /cm\.connection_status = 'accepted'/);
  assert.match(identityMigration, /cm\.connection_status = 'blocked'/);
  assert.match(identityMigration, /private_display_name/);
  assert.match(identityMigration, /Pending, removed, blocked, and stranger accounts receive no row/);
  assert.match(repository, /displayName: accepted \? profile!\.display_name : 'Anonymous account'/);
  assert.match(repository, /identityVisibility: accepted \? 'accepted_crew' : 'anonymous'/);
  assert.match(manager, /Anonymous account/);
  assert.match(manager, /Your private label:/);
  assert.match(manager, /Anonymous until accepted/);
  assert.match(accountability, /get_crew_connection_profiles/);
  assert.doesNotMatch(accountability, /get_public_circle_profiles/);
});

test('Crew invite acceptance is server controlled and cannot accept a typed identity', () => {
  const relationshipMigration = read('supabase/migrations/20260714183100_remove_crew_caps_and_guard_relationships.sql');
  const inviteMigration = read('supabase/migrations/20260714183200_guard_crew_invite_acceptance.sql');

  assert.match(relationshipMigration, /crew_acceptance_is_server_controlled/);
  assert.match(relationshipMigration, /permanent_account_required/);
  assert.match(relationshipMigration, /crew_members_no_self_link/);
  assert.match(relationshipMigration, /crew_members_one_relationship_per_owner/);
  assert.match(inviteMigration, /p_first_name text default null/);
  assert.doesNotMatch(inviteMigration, /trim\(p_first_name\)|coalesce\(nullif\(trim\(p_first_name/);
  assert.match(inviteMigration, /private_display_name/);
  assert.match(inviteMigration, /completed_account_profile_required/);
  assert.match(inviteMigration, /crew_connection_blocked/);
  assert.match(inviteMigration, /name = 'Accepted Crew member'/);
});

test('unlimited Crew check-ins reject every invalid recipient atomically', () => {
  const migration = read('supabase/migrations/20260714183400_unlimited_crew_check_in_rpc.sql');
  const service = read('src/services/crewAccountabilityServiceV2.ts');

  assert.match(migration, /select distinct requested_id/);
  assert.match(migration, /cannot_share_crew_check_in_with_self/);
  assert.match(migration, /all_recipients_must_be_accepted_crew_members/);
  assert.match(migration, /cm\.connection_status = 'accepted'/);
  assert.match(migration, /blocked\.connection_status = 'blocked'/);
  assert.doesNotMatch(migration, /limit\s+10|v_requested_count\s*>/i);
  assert.match(service, /new Set/);
  assert.match(service, /p_share_with: recipients/);
});

test('either participant can leave or block and access cleanup is immediate', () => {
  const migration = read('supabase/migrations/20260714183500_harden_crew_membership_paths.sql');
  const repository = read('src/services/crewRelationshipRepository.ts');
  const screen = read('src/screens/CrewAccountabilityScreenV3.tsx');

  assert.match(migration, /set_crew_connection_status/);
  assert.match(migration, /p_status not in \('blocked', 'removed'\)/);
  assert.match(migration, /delete from public\.crew_memberships/);
  assert.match(migration, /update public\.crew_check_in_shares/);
  assert.match(migration, /status = 'revoked'/);
  assert.match(migration, /delete from public\.circle_members/);
  assert.match(migration, /circle members insert owner accepted crew only/);
  assert.match(repository, /setAcceptedCrewConnectionStatus/);
  assert.match(repository, /rpc\('set_crew_connection_status'/);
  assert.match(screen, /leave Crew/);
  assert.match(screen, /endConnection\(item\.ownerUserId, 'blocked'\)/);
});
