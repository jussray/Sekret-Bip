import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const service = read('src/features/identity/accountProfile.ts');
const teenProfile = read('app/(teen)/profile.tsx');
const parentProfile = read('app/(parent)/profile.tsx');
const reviewMigration = read('supabase/migrations/20260711194500_guardian_review_queue.sql');
const reviewPanel = read('src/features/control-room/GuardianReviewsPanel.tsx');

test('server profile caching merges legacy presentation fields instead of deleting them', () => {
  assert.match(service, /async function mergeJsonObject/);
  assert.match(service, /JSON\.stringify\(\{ \.\.\.current, \.\.\.patch \}\)/);
  assert.match(service, /mergeJsonObject\('teen_profile_data'/);
  assert.match(service, /mergeJsonObject\('parent_profile_data'/);
  assert.match(service, /mergeJsonObject\('teen_circle_identity'/);
  assert.match(service, /mergeJsonObject\('parent_circle_identity'/);
});

test('teen profile edits round-trip through the durable profile service', () => {
  assert.match(teenProfile, /hydrateAccountProfile\('teen'\)/);
  assert.match(teenProfile, /await saveAccountProfile\(\{/);
  assert.match(teenProfile, /accountSide: 'teen'/);
  assert.match(teenProfile, /ageRange/);
  assert.match(teenProfile, /selectedCompanion: choice/);
  assert.match(teenProfile, /circleNickname: circleName\.trim\(\) \|\| 'anonymous bip'/);
  assert.doesNotMatch(teenProfile, /circleName\.trim\(\) \|\| name\.trim\(\)/);
});

test('parent profile edits keep private and community identity separate', () => {
  assert.match(parentProfile, /hydrateAccountProfile\('parent'\)/);
  assert.match(parentProfile, /await saveAccountProfile\(\{/);
  assert.match(parentProfile, /accountSide: 'parent'/);
  assert.match(parentProfile, /parentRoomStyle: roomStyle/);
  assert.match(parentProfile, /parentFocus: focus/);
  assert.match(parentProfile, /circleNickname: circleName\.trim\(\) \|\| 'Guardian Bip'/);
  assert.match(parentProfile, /supportStyle/);
});

test('guardian review decisions fail closed and require a rejection reason', () => {
  assert.match(reviewMigration, /if not p_approve and nullif\(btrim\(p_reason\), ''\) is null/);
  assert.match(reviewMigration, /if not found or v_current_state <> 'PENDING_GUARDIAN_REVIEW'/);
  assert.match(reviewMigration, /where av\.verification_state = 'PENDING_GUARDIAN_REVIEW'/);
  assert.match(reviewMigration, /revoke all on table public\.guardian_verification_reviews from anon, authenticated/);
});

test('guardian queue is usable only through the founder-admin control surface', () => {
  assert.match(reviewPanel, /isFounderProfile\(founder\)/);
  assert.match(reviewPanel, /founder\.can_manage_app/);
  assert.match(reviewPanel, /list_guardian_verification_queue/);
  assert.match(reviewPanel, /review_guardian_verification/);
  assert.match(reviewPanel, /does not create a parent link/);
});
