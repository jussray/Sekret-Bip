import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const profileService = read('src/features/identity/accountProfile.ts');
const indexScreen = read('app/index.tsx');
const parentEntryState = read('src/services/parentEntryState.ts');
const teenOnboarding = read('app/(onboarding)/reflection.tsx');
const parentOnboarding = read('app/(onboarding)/parent-setup.tsx');
const verificationTypes = read('src/types/verification.ts');
const verificationContext = read('src/context/VerificationContext.tsx');
const verificationState = read('src/services/verificationState.ts');
const routeAccess = read('src/services/routeAccess.ts');
const guardianScreen = read('app/(auth)/guardian-verification.tsx');
const guardianPanel = read('src/features/control-room/GuardianReviewsPanel.tsx');
const controlRoomScreen = read('src/screens/DevControlRoomScreen.tsx');
const cleanup = read('src/features/identity/clearProfileIdentityCache.ts');
const migration = read('supabase/migrations/20260711190000_account_profile_source_of_truth.sql');
const reviewMigration = read('supabase/migrations/20260711194500_guardian_review_queue.sql');
const guardianCommunityMigration = read('supabase/migrations/20260701174943_circle_v2_parent_community_guardian_access.sql');

function between(source, start, end) {
  const startAt = source.indexOf(start);
  assert.notEqual(startAt, -1, `missing start marker: ${start}`);
  const endAt = source.indexOf(end, startAt + start.length);
  assert.notEqual(endAt, -1, `missing end marker: ${end}`);
  return source.slice(startAt, endAt);
}

test('app_profiles becomes the durable profile source without exposing capability columns', () => {
  assert.match(migration, /add column if not exists account_side text/);
  assert.match(migration, /add column if not exists private_display_name text/);
  assert.match(migration, /add column if not exists onboarding_complete boolean/);
  const rpc = between(migration, 'create or replace function public.upsert_own_bip_profile', 'comment on function public.upsert_own_bip_profile');
  assert.match(rpc, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(rpc, /auth\.jwt\(\) ->> 'is_anonymous'/);
  assert.match(rpc, /on conflict \(user_id\) do update/);
  assert.doesNotMatch(rpc, /role\s*=/);
  assert.doesNotMatch(rpc, /can_view_audits\s*=/);
  assert.doesNotMatch(rpc, /can_manage_app\s*=/);
});

test('new auth users receive an app profile shell automatically', () => {
  assert.match(migration, /create trigger initialize_app_profile_on_signup/);
  assert.match(migration, /after insert on auth\.users/);
  assert.match(migration, /insert into public\.app_profiles\(user_id, email\)/);
  assert.match(migration, /revoke execute on function public\.initialize_app_profile\(\) from public, anon, authenticated/);
});

test('server profile wins and is written back to the device cache', () => {
  assert.match(profileService, /export async function loadServerAccountProfile/);
  assert.match(profileService, /\.from\('app_profiles'\)/);
  assert.match(profileService, /\.from\('circle_profiles'\)/);
  assert.match(profileService, /const remote = await loadServerAccountProfile\(\)/);
  assert.match(profileService, /if \(remote\) \{[\s\S]*await cacheAccountProfile\(remote\);[\s\S]*return remote;/s);
});

test('second-device boot hydrates account side and onboarding state from Supabase', () => {
  assert.match(indexScreen, /hydrateAccountProfile\(buildSide\)/);
  assert.match(indexScreen, /accountProfile\?\.accountSide \?\? buildSide \?\? userSide/);
  assert.match(indexScreen, /setUserSide\(profile\.accountSide\)/);
  assert.match(indexScreen, /accountProfile\?\.onboardingComplete/);
  assert.doesNotMatch(indexScreen, /AsyncStorage/);
  assert.doesNotMatch(indexScreen, /getItem\('teen_profile_done'\)/);
  assert.doesNotMatch(indexScreen, /getItem\('parent_profile_done'\)/);
});

test('legacy first-device profiles are promoted once instead of becoming a second source of truth', () => {
  assert.match(profileService, /if \(local\?\.onboardingComplete\)/);
  assert.match(profileService, /return saveAccountProfile\(\{/);
  assert.match(profileService, /ACCOUNT_PROFILE_CACHE_KEY = 'bip_account_profile_cache'/);
  assert.match(cleanup, /bip_account_profile_cache/);
});

test('teen and parent onboarding both persist through the guarded profile RPC', () => {
  assert.match(teenOnboarding, /await saveAccountProfile\(\{/);
  assert.match(teenOnboarding, /accountSide: 'teen'/);
  assert.match(parentOnboarding, /await saveAccountProfile\(\{/);
  assert.match(parentOnboarding, /accountSide: 'parent'/);
  assert.doesNotMatch(teenOnboarding, /\['teen_profile_done', 'true'\]/);
  assert.doesNotMatch(parentOnboarding, /\['parent_profile_done', 'true'\]/);
});

test('circle profile upsert is user-owned and pseudonymous by default', () => {
  assert.match(profileService, /\.from\('circle_profiles'\)\.upsert\(\{/);
  assert.match(profileService, /user_id: user\.id/);
  assert.match(profileService, /account_type: input\.accountSide === 'parent' \? 'guardian' : 'teen'/);
  assert.match(teenOnboarding, /circleNickname: 'anonymous bip'/);
  assert.match(parentOnboarding, /circleNickname: 'Guardian Bip'/);
  assert.doesNotMatch(profileService, /nickname:\s*privateDisplayName/);
});

test('guardian states are recognized end to end instead of collapsing to UNVERIFIED', () => {
  for (const state of [
    'VERIFIED_GUARDIAN',
    'PENDING_GUARDIAN_REVIEW',
    'GUARDIAN_REJECTED',
    'GUARDIAN_SUSPENDED',
  ]) {
    assert.equal(verificationTypes.includes(`'${state}'`), true, `${state} missing from type`);
    assert.equal(verificationContext.includes(`'${state}'`), true, `${state} missing from context mapper`);
    assert.equal(verificationState.includes(`'${state}'`), true, `${state} missing from state service`);
  }
});

test('parent routes fail closed unless the account is a verified guardian with an active link', () => {
  assert.match(routeAccess, /area === '\(parent\)'/);
  assert.match(routeAccess, /!isGuardianVerified\(options\.verificationState\)/);
  assert.match(routeAccess, /redirectTo: '\/\(auth\)\/guardian-verification'/);
  assert.match(routeAccess, /guardian_verification_required/);
  assert.doesNotMatch(routeAccess, /parentLinkState/);

  assert.match(indexScreen, /resolveParentEntryState\(\)/);
  assert.match(indexScreen, /routeForParentEntryState\(parentEntry\)/);
  assert.match(parentEntryState, /verification_state !== 'VERIFIED_GUARDIAN'/);
  assert.match(parentEntryState, /\.from\('parent_links'\)/);
  assert.match(parentEntryState, /\.eq\('status', 'active'\)/);
  assert.match(parentEntryState, /\.eq\('is_active', true\)/);
  assert.doesNotMatch(parentEntryState, /AsyncStorage\.(getItem|multiGet)/);
});

test('guardian review and teen parent-link consent remain separate state machines', () => {
  const guardianRpc = between(migration, 'create or replace function public.submit_guardian_verification', 'comment on function public.submit_guardian_verification');
  assert.match(guardianRpc, /PENDING_GUARDIAN_REVIEW/);
  assert.doesNotMatch(guardianRpc, /from public\.parent_links/);
  assert.doesNotMatch(guardianRpc, /insert into public\.parent_links/);
  assert.doesNotMatch(guardianRpc, /update public\.parent_links/);
  assert.match(parentOnboarding, /submitGuardianVerification\(\)/);
  assert.match(guardianScreen, /Teen sharing and parent-link consent are separate/);
});

test('guardian decisions are founder-admin gated, auditable, and operational in Control Room', () => {
  assert.match(reviewMigration, /create table if not exists public\.guardian_verification_reviews/);
  assert.match(reviewMigration, /p\.role in \('founder', 'admin'\)/);
  assert.match(reviewMigration, /p\.can_manage_app = true/);
  assert.match(reviewMigration, /create or replace function public\.list_guardian_verification_queue/);
  assert.match(reviewMigration, /create or replace function public\.review_guardian_verification/);
  assert.match(reviewMigration, /insert into public\.guardian_verification_reviews/);
  assert.doesNotMatch(reviewMigration, /insert into public\.parent_links/);
  assert.doesNotMatch(reviewMigration, /update public\.parent_links/);
  assert.match(guardianPanel, /list_guardian_verification_queue/);
  assert.match(guardianPanel, /review_guardian_verification/);
  assert.match(controlRoomScreen, /GuardianReviewsPanel/);
  assert.match(controlRoomScreen, /Guardians/);
});

test('guardian-only community access remains enforced in Postgres', () => {
  assert.match(guardianCommunityMigration, /create or replace function public\.is_verified_guardian\(\)/);
  assert.match(guardianCommunityMigration, /verification_state = 'VERIFIED_GUARDIAN'/);
  assert.match(guardianCommunityMigration, /cp\.account_type = 'guardian'/);
  assert.match(guardianCommunityMigration, /kind = 'parent_community'::circle_kind and public\.is_verified_guardian\(\)/);
});

test('anonymous sessions cannot masquerade as completed permanent accounts', () => {
  assert.match(profileService, /if \(!user \|\| user\.is_anonymous\) return null/);
  assert.match(profileService, /if \(!user \|\| user\.is_anonymous\) throw new Error\('A permanent signed-in account is required\.'\)/);
  assert.match(verificationContext, /session && !session\.user\.is_anonymous/);
  assert.match(indexScreen, /if \(user\.is_anonymous\) \{[\s\S]*router\.replace\('\/\(auth\)\/signup'\)/s);
});
