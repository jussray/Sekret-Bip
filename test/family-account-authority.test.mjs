import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const signupBaseline = read('supabase/migrations/20260919190000_auth_signup_onboarding_baseline.sql');
const relationshipOnly = read('supabase/migrations/20260919190500_parent_link_relationship_only.sql');
const teenAssuranceMigration = read('supabase/migrations/20260919190800_teen_age_assurance_authority.sql');
const jrMigration = read('supabase/migrations/20260919191000_bip_jr_managed_child_profiles.sql');
const verificationState = read('src/services/verificationState.ts');
const verificationContext = read('src/context/VerificationContext.tsx');
const bridge = read('src/bridge/index.ts');
const screenPurpose = read('src/constants/screenPurpose.ts');
const teenParentLinkScreen = read('app/(auth)/parent-link-verify.tsx');
const parentTeenVerificationScreen = read('app/(parent)/teen-verification.tsx');
const teenAssuranceService = read('src/services/teenAgeAssurance.ts');
const jrScreen = read('app/(parent)/bip-jr.tsx');
const jrService = read('src/services/bipJr.ts');
const parentRoutes = read('src/parent/routes.ts');
const sharedRoutes = read('src/shared/routes.ts');


test('permanent signup creates onboarding authority server-side, including anonymous upgrade', () => {
  assert.match(signupBaseline, /initialize_onboarding_state_from_auth/);
  assert.match(signupBaseline, /if coalesce\(new\.is_anonymous, false\) then/);
  assert.match(signupBaseline, /insert into public\.user_onboarding_state/);
  assert.match(signupBaseline, /after insert on auth\.users/);
  assert.match(signupBaseline, /after update of is_anonymous on auth\.users/);
  assert.match(signupBaseline, /old\.is_anonymous is true and new\.is_anonymous is false/);
  assert.match(signupBaseline, /'signed_up'/);
});


test('parent link is relationship consent and cannot grant or remove teen verification', () => {
  assert.match(relationshipOnly, /set parent_link_state = 'pending'/);
  assert.match(relationshipOnly, /set parent_link_state = 'active'/);
  assert.match(relationshipOnly, /set parent_link_state = 'expired'/);
  assert.match(relationshipOnly, /set parent_link_state = 'revoked'/);
  assert.doesNotMatch(relationshipOnly, /set\s+verification_state\s*=/i);

  assert.match(relationshipOnly, /extensions\.gen_random_bytes\(8\)/);
  assert.match(relationshipOnly, /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/);
  assert.match(relationshipOnly, /get_byte\(raw_bytes, i\) % 32/);
  assert.doesNotMatch(relationshipOnly, /md5\(gen_random_uuid\(\)::text\)/);

  const redeemStart = relationshipOnly.indexOf('create or replace function public.redeem_parent_link_invite');
  const revokeStart = relationshipOnly.indexOf('create or replace function public.revoke_parent_link', redeemStart);
  const redeemRegion = relationshipOnly.slice(redeemStart, revokeStart);
  assert.ok(redeemStart >= 0 && revokeStart > redeemStart);
  assert.match(redeemRegion, /v_parent_profile\.account_side <> 'parent'/);
  assert.match(redeemRegion, /v_parent_profile\.onboarding_complete is not true/);
  assert.doesNotMatch(redeemRegion, /verification_state\s*=\s*'VERIFIED_GUARDIAN'/i);

  assert.match(verificationState, /PARENT_APPROVED: \{ to: 'UNVERIFIED', parentLinkState: 'active' \}/);
  assert.match(verificationState, /PARENT_APPROVED: \{ to: 'VERIFIED_TEEN', parentLinkState: 'active' \}/);
  assert.match(verificationState, /VERIFICATION_CONFIRMED: \{ to: 'VERIFIED_TEEN' \}/);

  const unverifiedStart = verificationState.indexOf('UNVERIFIED: {');
  const pendingParentStart = verificationState.indexOf('PENDING_PARENT: {', unverifiedStart);
  const unverifiedRegion = verificationState.slice(unverifiedStart, pendingParentStart);
  assert.doesNotMatch(unverifiedRegion, /PARENT_APPROVED: \{ to: 'VERIFIED_TEEN'/);
});


test('Teen verification has separate explicit age-assurance authority', () => {
  assert.match(teenAssuranceMigration, /create table if not exists public\.teen_age_assurance_receipts/);
  assert.match(teenAssuranceMigration, /confirm_linked_teen_age_assurance/);
  assert.match(teenAssuranceMigration, /confirm_own_self_declared_adult_teen_age_assurance/);
  assert.match(teenAssuranceMigration, /v_guardian_state <> 'VERIFIED_GUARDIAN'/);
  assert.match(teenAssuranceMigration, /verification_state = 'VERIFIED_TEEN'/);
  assert.match(teenAssuranceMigration, /verification_reason = 'guardian_age_assurance'/);
  assert.match(teenAssuranceMigration, /verification_reason = 'self_declared_18_19'/);
  assert.match(teenAssuranceMigration, /method in \('guardian_confirmation', 'self_declared_age_bucket'\)/);
  assert.match(teenAssuranceMigration, /pl\.status = 'active'/);
  assert.doesNotMatch(
    teenAssuranceMigration,
    /\b(raw_id|raw_age_evidence|selfie|selfie_url|birth_date|full_birth_date)\s+(text|date|jsonb|bytea|uuid)\b/i,
  );

  assert.match(teenAssuranceService, /rpc\('confirm_linked_teen_age_assurance'/);
  assert.match(teenAssuranceService, /rpc\('confirm_own_self_declared_adult_teen_age_assurance'/);
  assert.match(teenAssuranceService, /'guardian_confirmation' \| 'self_declared_age_bucket'/);
  assert.match(parentTeenVerificationScreen, /Confirm age\.\{`\\n`\}Not access\./);
  assert.match(parentTeenVerificationScreen, /does not grant you private account access/i);
  assert.match(parentTeenVerificationScreen, /Confirm Teen age assurance/);

  assert.match(teenParentLinkScreen, /TRUSTED CONNECTION/);
  assert.match(teenParentLinkScreen, /linking alone does not verify your account/);
  assert.match(teenParentLinkScreen, /Confirm my 18–19 age range/);
  assert.match(teenParentLinkScreen, /parentLinkState === 'active'/);
});


test('Teen assurance is reachable separately from Parent Link', () => {
  assert.match(parentRoutes, /teenVerification:\s+'\/\(parent\)\/teen-verification'/);
  assert.match(sharedRoutes, /'teen-verification': PARENT_ROUTES\.teenVerification/);
  assert.match(screenPurpose, /label: 'Teen Verification', route: 'teen-verification'/);
  assert.match(screenPurpose, /Verification is a separate action/);
  assert.match(screenPurpose, /Linking alone does not verify the Teen/);
});


test('Bip Jr is a verified-parent-managed child profile, never a child auth identity', () => {
  assert.match(jrMigration, /create table if not exists public\.jr_child_profiles/);
  assert.match(jrMigration, /create table if not exists public\.jr_parental_consent_receipts/);
  assert.match(jrMigration, /verification_state = 'VERIFIED_GUARDIAN'/);
  assert.match(jrMigration, /create_own_jr_child_profile/);
  assert.match(jrMigration, /'bip-jr-parental-consent-v1'/);
  assert.doesNotMatch(jrMigration, /insert into\s+auth\.users/i);
  assert.doesNotMatch(jrMigration, /child_email|child_password/i);

  assert.match(jrService, /rpc\('create_own_jr_child_profile'/);
  assert.match(jrService, /rpc\('archive_own_jr_child_profile'/);
  assert.match(jrScreen, /do not get a separate email, password, or Teen account/);
  assert.match(jrScreen, /Different from Teen \+ Bridge/);
  assert.match(jrScreen, /parent or legal guardian and I consent/);
});


test('Bip Jr is reachable from Parent More', () => {
  assert.match(parentRoutes, /bipJr:\s+'\/\(parent\)\/bip-jr'/);
  assert.match(sharedRoutes, /'bip-jr': PARENT_ROUTES\.bipJr/);
  assert.match(screenPurpose, /label: 'Bip Jr', route: 'bip-jr'/);
});


test('Circle pseudonymity and Bridge teen control remain separate from account identity', () => {
  assert.match(screenPurpose, /public anonymous posts/);
  assert.match(screenPurpose, /anonymous identity/);
  assert.match(bridge, /teenInitiatesOnly:\s*true/);
  assert.match(bridge, /parentCannotPullTeenData:\s*true/);
  assert.match(bridge, /teenCanRevokeShare:\s*true/);
});


test('verification read failure remains fail-closed without impersonating logout', () => {
  assert.match(
    verificationContext,
    /const permanentSession = Boolean\(session && !session\.user\.is_anonymous\);[\s\S]*setSession\(session\);[\s\S]*setAuthenticated\(permanentSession\);[\s\S]*setSnapshot\(INITIAL_VERIFICATION_SNAPSHOT\);/,
  );

  const realtimeLoadStart = verificationContext.indexOf('void loadVerificationForSession(session)');
  const realtimeFinally = verificationContext.indexOf('.finally(() => {', realtimeLoadStart);
  const realtimeFailureRegion = verificationContext.slice(realtimeLoadStart, realtimeFinally);
  assert.ok(realtimeLoadStart >= 0 && realtimeFinally > realtimeLoadStart);
  assert.doesNotMatch(realtimeFailureRegion, /setSession\(null\)/);
  assert.doesNotMatch(realtimeFailureRegion, /setAuthenticated\(false\)/);
});
