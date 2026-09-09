import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the mounted AppContext owns durable Teen and Parent journal writes', () => {
  const context = read('src/context/AppContext.tsx');
  assert.equal(context.includes("from '@/features/journal/journalRepository'"), true);
  assert.equal(context.includes("upsertJournalEntry(entry, 'teen')"), true);
  assert.equal(context.includes("upsertJournalEntry(entry, 'parent')"), true);
  assert.equal(context.includes("upsertJournalEntry(patched, 'teen')"), true);
  assert.equal(context.includes('useState<CirclePost[]>'), false);
  assert.equal(context.includes('useState<VoiceNote[]>'), false);
});

test('canonical state hydrates durable feature records after the offline cache', () => {
  const state = read('src/hooks/useSekretState.ts');
  assert.equal(state.includes('pullAll()'), true);
  assert.equal(state.includes("loadJournalEntries('teen')"), true);
  assert.equal(state.includes("loadJournalEntries('parent')"), true);
  assert.equal(state.includes('loadPeriodDays()'), true);
  assert.equal(state.includes('mergeById'), true);
});

test('public Circle uses owner-only support totals and guarded identity RPCs', () => {
  const repository = read('src/features/circle/circleRepository.ts');
  const screen = read('app/(teen)/circle/feed-v2.tsx');
  const ownerOnlyMigration = read('supabase/migrations/20260714054500_make_circle_support_counts_owner_only.sql');

  assert.equal(repository.includes("rpc('get_public_circle_feed'"), true);
  assert.equal(repository.includes("rpc('create_public_circle_post'"), true);
  assert.equal(repository.includes(".select('id,user_id,text,post_mood,media_kind,reactions,created_at')"), false);
  assert.equal(repository.includes('row.is_own_post ? normalizeReactions'), true);
  assert.equal(repository.includes('react_to_public_circle_post'), true);
  assert.equal(repository.includes('get_public_circle_profiles'), true);
  assert.equal(repository.includes(".from('circle_profiles')"), false);

  assert.equal(ownerOnlyMigration.includes('get_public_circle_feed'), true);
  assert.equal(ownerOnlyMigration.includes('case when p.user_id = v_user then p.reactions else null end'), true);
  assert.equal(ownerOnlyMigration.includes('revoke select on table public.public_circle_posts from anon, authenticated'), true);

  assert.equal(screen.includes('createPublicCirclePost'), true);
  assert.equal(screen.includes('support on your bip · only you'), true);
  assert.equal(screen.includes('item.viewerReaction === reaction.key'), true);
  assert.equal(screen.includes('Date.now()'), false);
  assert.equal(screen.includes('For You'), false);
  assert.equal(screen.includes('Following'), false);
});

test('legacy Circle deep links redirect to the canonical reactions-only feed', () => {
  const legacyFeed = read('app/(teen)/circle/feed.tsx');
  const legacyDetail = read('app/(teen)/circle/[id].tsx');
  assert.equal(legacyFeed.includes('<Redirect href="/(teen)/circle"'), true);
  assert.equal(legacyDetail.includes('<Redirect href="/(teen)/circle"'), true);
  assert.equal(legacyFeed.includes('syncCircleReaction'), false);
  assert.equal(legacyDetail.includes('syncCircleReaction'), false);
});

test('the database migrations separate private notebooks and harden Circle', () => {
  const migration = read('supabase/migrations/20260712190000_feature_flow_contracts.sql');
  const profileReadMigration = read('supabase/migrations/20260712195000_secure_circle_profile_reads.sql');
  const optimizerMigration = read('supabase/migrations/20260712200000_optimize_circle_policy_plans.sql');
  assert.equal(migration.includes('owner_side text not null'), true);
  assert.equal(migration.includes("check (owner_side in ('teen', 'parent'))"), true);

  assert.equal(profileReadMigration.includes('circle_profiles_owner_select'), true);
  assert.equal(profileReadMigration.includes('get_public_circle_profiles'), true);
  assert.equal(profileReadMigration.includes('returns table'), true);
  assert.equal(profileReadMigration.includes('account_type text'), false);
  assert.equal(profileReadMigration.includes('set search_path = pg_catalog, pg_temp'), true);
  assert.equal(profileReadMigration.includes('revoke all on function public.get_public_circle_profiles(uuid[]) from anon'), true);
  assert.equal(profileReadMigration.includes('grant execute on function public.get_public_circle_profiles(uuid[]) to authenticated'), true);

  assert.equal(migration.includes('drop policy if exists pcp_insert'), true);
  assert.equal(migration.includes('public_circle_posts_permanent_insert'), true);
  assert.equal(migration.includes('public_circle_posts_permanent_delete'), true);
  assert.equal(migration.includes('grant select, insert, delete on table public.public_circle_posts to authenticated'), true);

  assert.equal(migration.includes('circle_reactions_unique_user_post'), true);
  assert.equal(migration.includes('circle_reactions_user_id_idx'), true);
  assert.equal(migration.includes('circle_reactions_permanent_accounts_only'), true);
  assert.equal(migration.includes('circle_reactions_direct_insert_non_public'), true);
  assert.equal(migration.includes("post_type <> 'public'"), true);
  assert.equal(migration.includes('as restrictive'), true);
  assert.equal(migration.includes("auth.jwt() ->> 'is_anonymous'"), true);
  assert.equal(migration.includes('revoke all on table public.circle_reactions from anon'), true);
  assert.equal(migration.includes('grant select, insert, update, delete on table public.circle_reactions to authenticated'), true);
  assert.equal(migration.includes('react_to_public_circle_post'), true);
  assert.equal(migration.includes('for update;'), true);
  assert.equal(migration.includes('set search_path = pg_catalog, pg_temp'), true);
  assert.equal(migration.includes('revoke all on function public.react_to_public_circle_post(bigint, text) from anon'), true);
  assert.equal(migration.includes('grant execute on function public.react_to_public_circle_post(bigint, text) to authenticated'), true);

  assert.equal(optimizerMigration.includes('drop index if exists public.circle_reactions_unique_user_post'), true);
  assert.equal(optimizerMigration.includes('public_circle_posts_user_id_idx'), true);
  assert.equal(optimizerMigration.includes("((select auth.jwt()) ->> 'is_anonymous')"), true);
  assert.equal(optimizerMigration.includes('circle_profiles_owner_select'), true);
  assert.equal(optimizerMigration.includes('circle_reactions_permanent_accounts_only'), true);
});

test('Parent Circle does not re-upload local history or double-save a new post', () => {
  const route = read('app/(parent)/circle/feed.tsx');
  assert.equal(route.includes('parentCirclePosts.forEach'), false);
  assert.equal(route.includes('syncParentCirclePost'), false);
  assert.equal(route.includes('saveParentCirclePost={saveParentCirclePost}'), true);
});

test('navigation exposes Bridge and canonicalizes duplicate Room paths', () => {
  const parentLayout = read('app/(parent)/_layout.tsx');
  const sharedRoutes = read('src/shared/routes.ts');
  const userRoom = read('app/(teen)/user-room.tsx');
  const points = read('app/(teen)/points.tsx');
  assert.equal(parentLayout.includes('name="bridge"'), true);
  assert.equal(parentLayout.includes('name="calm" options={{ href: null }}'), true);
  assert.equal(sharedRoutes.includes("return side === 'parent' ? PARENT_ROUTES.more : TEEN_ROUTES.more"), true);
  assert.equal(sharedRoutes.includes('crew: TEEN_ROUTES.circle'), true);
  assert.equal(userRoom.includes('<Redirect href="/(teen)/room"'), true);
  assert.equal(points.includes('comfortSessions={comfortSessions}'), true);
});

test('Crew uses unlimited accepted-account identity and local-only founder samples', () => {
  const circleRoute = read('app/(teen)/circle/index.tsx');
  const screenEntry = read('src/screens/CrewAccountabilityScreen.tsx');
  const screen = read('src/screens/CrewAccountabilityScreenV3.tsx');
  const serviceEntry = read('src/services/crewAccountabilityService.ts');
  const service = read('src/services/crewAccountabilityServiceV2.ts');

  assert.equal(circleRoute.includes('BipCrewScreen'), false);
  assert.equal(circleRoute.includes('CrewAccountabilityScreen'), true);
  assert.equal(screenEntry.includes('CrewAccountabilityScreenV3'), true);
  assert.equal(serviceEntry.includes('crewAccountabilityServiceV2'), true);
  assert.equal(screen.includes("isRelationshipFeatureAvailable('crewAccountability'"), true);
  assert.equal(screen.includes(".eq('connection_status', 'accepted')"), true);
  assert.equal(screen.includes("rpc('get_crew_connection_profiles'"), true);
  assert.equal(screen.includes("rpc('get_public_circle_profiles'"), false);
  assert.equal(screen.includes('select all'), true);
  assert.equal(screen.includes('leave Crew'), true);
  assert.equal(screen.includes('block'), true);
  assert.equal(screen.includes('PREVIEW_PROFILES'), true);
  assert.equal(screen.includes('Nothing is written to Supabase.'), true);
  assert.equal(service.includes("rpc('create_crew_check_in'"), true);
  assert.equal(service.includes('MAX_SHARES'), false);
});
