import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const service = fs.readFileSync(new URL('../src/services/onboarding.ts', import.meta.url), 'utf8');
const context = fs.readFileSync(new URL('../src/context/OnboardingContext.tsx', import.meta.url), 'utf8');
const legacyServicePath = fs.readFileSync(new URL('../services/onboarding.ts', import.meta.url), 'utf8');
const legacyContextPath = fs.readFileSync(new URL('../context/OnboardingContext.tsx', import.meta.url), 'utf8');
const welcome = fs.readFileSync(new URL('../app/(onboarding)/welcome.tsx', import.meta.url), 'utf8');
const age = fs.readFileSync(new URL('../app/(onboarding)/age.tsx', import.meta.url), 'utf8');
const consent = fs.readFileSync(new URL('../app/(onboarding)/consent.tsx', import.meta.url), 'utf8');
const storage = fs.readFileSync(new URL('../src/utils/storage.ts', import.meta.url), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start + 1) : source.length;
  assert.notEqual(start, -1, `${name} is missing`);
  return source.slice(start, end === -1 ? source.length : end);
}

test('onboarding state writes target the real, RLS-hardened table with the real stage enum', () => {
  assert.match(service, /from\('user_onboarding_state'\)/);
  assert.doesNotMatch(service, /from\('onboarding_state'\)/);

  for (const stage of [
    'pre_signup', 'signed_up', 'consent_complete', 'age_verified', 'role_selected',
    'name_set', 'identity_set', 'reflection_complete', 'parent_link_sent',
    'parent_linked', 'parent_link_skipped', 'parent_setup_complete', 'activated', 'steady_state',
  ]) {
    assert.match(service, new RegExp(`'${stage}'`), `ONBOARDING_STAGES is missing '${stage}'`);
  }
});

test('baseline initialization is insert-only, preserves acquisition metadata, and checks errors', () => {
  const body = functionBody(service, 'initOnboardingState', 'assertCompatibleValue');
  assert.match(body, /\.insert\(\{/);
  assert.match(body, /stage: 'signed_up'/);
  assert.match(body, /role: 'unknown'/);
  assert.match(body, /device_platform: platform/);
  assert.match(body, /referral_source: referralSource \?\? null/);
  assert.match(body, /\.select\(\)\s*\.single\(\)/);
  assert.match(body, /if \(error\)/);
  assert.doesNotMatch(body, /\.upsert\(/);
});

test('stage writes use bounded compare-and-swap retries instead of silent false success', () => {
  const body = functionBody(service, 'advanceStageInternal', 'advanceStage');
  assert.match(body, /\.eq\('stage', current\.stage\)/);
  assert.match(body, /if \(error\)/);
  assert.match(body, /Stage advance failed/);
  assert.match(body, /MAX_WRITE_ATTEMPTS/);
  assert.match(body, /getOnboardingState\(userId\)/);
  assert.match(body, /repairPassedStageMetadata/);
});

test('local progress mirrors confirmed database state only', () => {
  const mirror = functionBody(service, 'mirrorConfirmedStage', 'getOnboardingState');
  const advance = functionBody(service, 'advanceStageInternal', 'advanceStage');
  assert.match(mirror, /AsyncStorage\.multiSet/);
  assert.match(mirror, /MAX_LOCAL_LOG_ENTRIES/);
  assert.match(advance, /if \(data\)[\s\S]*mirrorConfirmedStage\(updated, payload\)/);
  assert.doesNotMatch(advance, /AsyncStorage\.setItem\(STAGE_KEY, payload\.stage\)/);
});

test('markActivated uses the same conflict-safe stage path with valid activation metadata', () => {
  const body = functionBody(service, 'markActivated', 'setParentLinkCode');
  assert.match(body, /return advanceStage\(userId, \{/);
  assert.match(body, /stage: 'activated'/);
  assert.match(body, /activation_action: activationAction/);
  assert.match(service, /\^\[a-z0-9_\]\+\$/);
});

test('onboarding context awaits writes and returns truthful success status', () => {
  const body = functionBody(context, 'OnboardingProvider', 'useOnboarding');
  assert.match(context, /\) => Promise<boolean>/);
  assert.match(context, /advance: async \(\) => false/);
  assert.match(body, /if \(!client\) return false/);
  assert.match(body, /await client\.auth\.getUser\(\)/);
  assert.match(body, /await advanceStage\(data\.user\.id, stage, payload\)/);
  assert.match(body, /return true/);
  assert.match(body, /return false/);
  assert.doesNotMatch(body, /advanceStage\([^\n]+\.catch\(\(\) => null\)/);
});

test('age-first welcome awaits writes and exposes canonical companion names', () => {
  assert.match(welcome, /await advance\('age_verified'/);
  assert.match(welcome, /await advance\('role_selected', \{ role: 'parent' \}\)/);
  assert.match(welcome, /'💜 Suhana'/);
  assert.match(welcome, /'💙 Sy'/);
  assert.doesNotMatch(welcome, /'💜 Raylene'/);
  assert.doesNotMatch(welcome, /'💙 Rylane'/);
});

test('historical root paths are preserved as compatibility entry points', () => {
  assert.match(legacyServicePath, /export \* from '\.\.\/src\/services\/onboarding'/);
  assert.match(legacyContextPath, /from '\.\.\/src\/context\/OnboardingContext'/);
  assert.match(legacyServicePath, /Keep this file in place/);
  assert.match(legacyContextPath, /path is preserved/);
});

test('public age route redirects permanent accounts to consent before durable writes', () => {
  assert.match(age, /getPermanentConsentGate/);
  assert.match(age, /consentService\.hasCompletedOnboarding\(\) \? 'complete' : 'missing_consent'/);
  assert.match(age, /router\.replace\(`\/\(onboarding\)\/consent\?side=\$\{decision\.nextSide\}` as never\)/);
  assert.match(age, /router\.replace\('\/\(onboarding\)\/consent\?side=parent' as never\)/);
  assert.match(age, /if \(consentGate === 'complete'\)[\s\S]*await advance\('age_verified'/);
});

test('consent replays scoped local choices only after required consent is durable', () => {
  assert.match(consent, /await consentService\.load\(userId\)/);
  assert.match(consent, /if \(!consentService\.hasCompletedOnboarding\(\)\)/);
  assert.match(consent, /await advance\('consent_complete'\)/);
  assert.match(consent, /AsyncStorage\.getItem\(AGE_ASSURANCE_STORAGE_KEYS\.bucket\)/);
  assert.match(consent, /if \(!isStoredAgeBucket\(storedAge\) \|\| storedAge === 'under-13'\)/);
  assert.match(consent, /await advance\('age_verified', \{ age_bucket: storedAge \}\)/);
  assert.match(consent, /await advance\('role_selected', \{ role: 'teen' \}\)/);
});

test('private cache clearing removes transient onboarding age and side choices', () => {
  for (const key of [
    'bip_onboarding_side',
    'bip_onboarding_age',
    'bip_age_verification_status',
    'bip_age_verification_method',
    'bip_age_guardian_required',
    'bip_age_raw_evidence_stored',
  ]) {
    assert.match(storage, new RegExp(`'${key}'`));
  }
});
