import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('legacy Bip Energy fade remains bounded history but is not a teen return trigger', () => {
  const restoreMigration = read('supabase/migrations/20260714045500_restore_intentional_bip_energy_fade.sql');
  const finalMigration = read('supabase/migrations/20260714051500_align_bip_energy_with_bip_events.sql');
  const ledger = read('src/features/activity/ledger.ts');
  const energyService = read('src/features/activity/bipEnergy.ts');
  const overlay = read('components/retention/BipReturnOverlay.tsx');

  // Preserve migration lineage and the bounded legacy contract for audit/rollback.
  assert.match(finalMigration, /v_days_away <= 1/);
  assert.match(finalMigration, /least\(v_balance, least\(5, greatest\(1, v_days_away - 1\)\)\)/);
  assert.match(finalMigration, /on conflict do nothing/);
  assert.match(finalMigration, /v_balance <= 0/);
  assert.match(finalMigration, /'grace_days', 1/);
  assert.match(finalMigration, /'daily_cap', 5/);
  assert.match(finalMigration, /'never_below_zero', true/);
  assert.match(finalMigration, /source_type[\s\S]*'inactivity_adjustment'/);
  assert.match(finalMigration, /from public\.bip_events/);
  assert.match(finalMigration, /event_type not in \('app_opened', 'streak_milestone'\)/);
  assert.doesNotMatch(finalMigration, /from public\.activity_events/);
  assert.match(restoreMigration, /when 'streak_milestone' then 3/);
  assert.match(energyService, /let inFlightCheck/);
  assert.match(energyService, /if \(inFlightCheck\) return inFlightCheck/);
  assert.match(energyService, /cachedUserId === user\.id/);

  // Humane return UX does not invoke inactivity decay or advertise absence loss.
  assert.doesNotMatch(ledger, /applyBipEnergyFade/);
  assert.doesNotMatch(overlay, /applyBipEnergyFade|loadUnseenBipEnergyAdjustment|markBipEnergyAdjustmentSeen/);
  assert.doesNotMatch(overlay, /Bip Energy faded|days away|streak resets/);
  assert.match(ledger, /Teen return UX does not subtract points for time away/);
});

test('Room and History use meaningful return value rather than streak shame', () => {
  const roomRoute = read('app/(teen)/room.tsx');
  const overlay = read('components/retention/BipReturnOverlay.tsx');
  const historyRoute = read('app/(teen)/history.tsx');
  const historyScreen = read('screens/MeaningfulHistoryScreen.tsx');
  const receipts = read('src/features/retention/meaningfulReturn.ts');

  assert.match(roomRoute, /BipReturnOverlay/);
  assert.match(overlay, /Your check-ins stay part of your story, even after time away/);
  assert.match(overlay, /without asking you to show up every day/);
  assert.doesNotMatch(overlay, /perfect streak|streak resets|Bip Energy faded/);
  assert.match(historyRoute, /MeaningfulHistoryScreen/);
  assert.doesNotMatch(historyRoute, /streakDays=/);
  assert.match(historyScreen, /days you checked in this month/);
  assert.match(historyScreen, /Missing a day does not erase anything/);
  assert.match(receipts, /journal_saved/);
  assert.match(receipts, /comfort_completed/);
  assert.match(receipts, /bridge_shared/);
  assert.doesNotMatch(receipts, /journalText|messageContent|transcript/);
});

test('public Circle keeps support actions and makes totals owner-only', () => {
  const circle = read('app/(teen)/circle/feed-v2.tsx');
  const repository = read('src/features/circle/circleRepository.ts');
  const migration = read('supabase/migrations/20260714054500_make_circle_support_counts_owner_only.sql');

  assert.match(circle, /Only the person who posted can see their private totals/);
  assert.match(circle, /support on your bip · only you/);
  assert.match(circle, /item\.isOwnPost/);
  assert.match(circle, /item\.viewerReaction === reaction\.key/);
  assert.match(circle, /accessibilityLabel={`Support with \$\{reaction\.label\}`}/);
  assert.doesNotMatch(circle, /const count = item\.reactions\[reaction\.key\]/);
  assert.doesNotMatch(circle, /busy \? '…' : count/);

  assert.match(repository, /rpc\('get_public_circle_feed'/);
  assert.match(repository, /row\.is_own_post \? normalizeReactions/);
  assert.doesNotMatch(repository, /select\('id,user_id,text,post_mood,media_kind,reactions,created_at'\)/);

  assert.match(migration, /case when p\.user_id = v_user then p\.reactions else null end/);
  assert.match(migration, /return jsonb_build_object\('saved', true, 'reaction', p_emoji\)/);
  assert.match(migration, /revoke select on table public\.public_circle_posts from anon, authenticated/);
});

test('Bridge carries a teen-selected response request without private content', () => {
  const migration = read('supabase/migrations/20260714043000_humane_retention_loops.sql');
  const teenDock = read('components/bridge/BridgeResponsePreferenceDock.tsx');
  const parentCard = read('components/bridge/ParentBridgeResponseRequestCard.tsx');
  const bridgeCompat = read('src/utils/parentBridgeCompat.ts');
  const preferenceContract = read('src/features/bridge/responsePreference.ts');

  assert.match(migration, /add column if not exists response_preference text/);
  assert.match(migration, /'listen', 'comfort', 'help_plan', 'check_later', 'give_space'/);
  assert.match(teenDock, /What would help after you send this\?/);
  assert.match(teenDock, /They still do not get the rest of your private space/);
  assert.match(parentCard, /Honor the request without asking to see journals, chats, mood history/);
  assert.match(bridgeCompat, /response_preference: responsePreference/);
  assert.match(bridgeCompat, /select\('id, share_type, conv_mode, response_preference/);
  assert.match(preferenceContract, /just listen/);
  assert.match(preferenceContract, /give me space/);
});

test('new private retention and Bridge keys clear on sign-out', () => {
  const storage = read('src/utils/storage.ts');

  for (const key of [
    'sekretbip_meaningful_return_receipts_v1',
    'sekretbip_meaningful_return_seen_v1',
    'sekretbip_bip_energy_adjustment_v1',
    'sekretbip_bip_energy_adjustment_seen_v1',
    'sekretbip_bridge_response_preference_v1',
  ]) {
    assert.match(storage, new RegExp(key));
  }

  assert.match(storage, /PRIVATE_ACCOUNT_KEYS/);
  assert.match(storage, /AsyncStorage\.multiRemove\(\[\.\.\.PRIVATE_ACCOUNT_KEYS\]\)/);
});

test('meaningful return snapshot is metadata-only and permanent-account gated', () => {
  const migration = read('supabase/migrations/20260714043000_humane_retention_loops.sql');

  assert.match(migration, /permanent account required/);
  assert.match(migration, /latest_safe_meta/);
  assert.match(migration, /'category', meta ->> 'category'/);
  assert.match(migration, /'route', meta ->> 'route'/);
  assert.match(migration, /'receiptKey', meta ->> 'receiptKey'/);
  assert.doesNotMatch(migration, /journal_entries|voice_notes|parent_notes\.content/);
});
