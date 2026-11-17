import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('root router protects authenticated areas through centralized route access', () => {
  const layout = read('app/_layout.tsx');
  const verificationContext = read('src/context/VerificationContext.tsx');
  const routeAccess = read('src/services/routeAccess.ts');

  assert.match(
    verificationContext,
    /auth\.getSession\(\)/,
    'verification context should resolve the current Supabase session',
  );
  assert.match(
    verificationContext,
    /onAuthStateChange/,
    'verification context should react to authentication session changes',
  );
  assert.match(verificationContext, /!session\.user\.is_anonymous/, 'anonymous sessions must not count as permanent accounts');
  assert.match(layout, /isAuthResolved/, 'root layout should wait for auth hydration');
  assert.match(layout, /isAuthenticated/, 'root layout should enforce the resolved auth session');
  assert.match(layout, /onAuthStateChange/, 'root layout should react to sign-out for cache cleanup');
  assert.match(layout, /router\.replace\('\/\(auth\)\/login'\)/, 'signed-out users should be sent to login');
  assert.match(layout, /decideRouteAccess/, 'root layout should delegate route policy centrally');
  assert.match(layout, /router\.replace\(decision\.redirectTo\)/, 'denied routes should use the centralized redirect');

  assert.match(routeAccess, /area === '\(parent\)'/);
  assert.match(routeAccess, /!isGuardianVerified\(options\.verificationState\)/);
  assert.match(routeAccess, /redirectTo: '\/\(auth\)\/guardian-verification'/);
  assert.match(routeAccess, /area === '\(parent\)'[\s\S]*redirectTo: '\/\(teen\)\/room'/s);
  assert.match(routeAccess, /verification_required/);
  assert.match(routeAccess, /guardian_verification_required/);
  assert.match(routeAccess, /manual_review/);
  assert.match(routeAccess, /suspended/);
});

test('a second device restores side and onboarding from the server profile', () => {
  const index = read('app/index.tsx');
  const profile = read('src/features/identity/accountProfile.ts');

  assert.match(index, /hydrateAccountProfile\(buildSide\)/);
  assert.match(index, /accountProfile\?\.accountSide \?\? buildSide \?\? userSide/);
  assert.match(index, /setUserSide\(profile\.accountSide\)/);
  assert.match(index, /accountProfile\?\.onboardingComplete/);
  assert.doesNotMatch(index, /AsyncStorage/);

  assert.match(profile, /\.from\('app_profiles'\)/);
  assert.match(profile, /const remote = await loadServerAccountProfile\(\)/);
  assert.match(profile, /await cacheAccountProfile\(remote\)/);
  assert.match(profile, /if \(local\?\.onboardingComplete\)[\s\S]*return saveAccountProfile\(/s);
});

test('teen and parent bottom navigation each preserve their five primary jobs', () => {
  const expectations = [
    {
      path: 'app/(teen)/_layout.tsx',
      order: ['name="room"', 'name="pages"', 'name="calm"', 'name="circle"', 'name="more"'],
      label: 'Room, Pages, Calm, Circle, More',
    },
    {
      path: 'app/(parent)/_layout.tsx',
      order: ['name="room"', 'name="bridge"', 'name="pages"', 'name="circle"', 'name="more"'],
      label: 'Room, Bridge, Pages, Circle, More',
    },
  ];

  for (const { path, order, label } of expectations) {
    const layout = read(path);
    let previous = -1;
    for (const marker of order) {
      const position = layout.indexOf(marker);
      assert.notEqual(position, -1, `${path} must include ${marker}`);
      assert.ok(position > previous, `${path} must order tabs ${label}`);
      previous = position;
    }
  }
});

test('privacy-relevant schema is defined in migrations and can be safely rerun', () => {
  // supabase/migrations/ is the single source of truth for schema (db/schema.sql
  // was retired — it had drifted from the real, currently-used design: dead
  // accounts/parent_teen_invites/parent_teen_links/teen_guardian_shares tables
  // that no app code ever read, superseded by parent_links + account_verification).
  const init = read('supabase/migrations/0001_init.sql');
  const consent = read('supabase/migrations/20260628_consent_visibility.sql');
  const crewColumns = read('supabase/migrations/20260702060000_crew_members_bip_id.sql');
  const profile = read('supabase/migrations/20260711190000_account_profile_source_of_truth.sql');

  assert.match(init, /create table if not exists public\.mood_history/);
  assert.match(init, /create table if not exists public\.journal_entries/);
  assert.match(init, /create table if not exists public\.crew_members/);
  assert.match(init, /primary key \(user_id, id\)/, 'client-generated ids must be scoped per user, not global');
  assert.match(init, /drop policy if exists/, 'RLS policies must be re-creatable so the migration is safe to rerun');

  assert.match(consent, /ADD COLUMN IF NOT EXISTS visibility/);
  assert.match(consent, /journal_entries_visibility_check/);

  assert.match(crewColumns, /add column if not exists bip_id/);
  assert.match(crewColumns, /add column if not exists connection_status/);

  assert.match(profile, /add column if not exists account_side text/);
  assert.match(profile, /create or replace function public\.upsert_own_bip_profile/);
  assert.match(profile, /create or replace function public\.submit_guardian_verification/);
  assert.match(profile, /revoke all on table public\.app_profiles from anon/);
});

test('legacy API imports resolve to the canonical src implementation', () => {
  const bridge = read('utils/api.ts');
  const canonical = read('src/utils/api.ts');
  assert.match(bridge, /export \* from '\.\.\/src\/utils\/api'/);
  for (const name of ['fetchSekretReply', 'fetchSekretVoice', 'fetchSekretTranscribe']) {
    assert.match(canonical, new RegExp(`export async function ${name}`));
  }
});
