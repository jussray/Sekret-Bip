import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/services/parentEntryState.ts', import.meta.url), 'utf8');

test('parent entry resolution follows session, profile, verification, then active link', () => {
  const session = source.indexOf('supabase.auth.getSession()');
  const profile = source.indexOf(".from('app_profiles')");
  const verification = source.indexOf(".from('account_verification')");
  const link = source.indexOf(".from('parent_links')");

  assert.equal(session >= 0, true);
  assert.equal(profile > session, true);
  assert.equal(verification > profile, true);
  assert.equal(link > verification, true);
  assert.match(source, /account_side,onboarding_complete/);
  assert.match(source, /verification_state/);
  assert.match(source, /\.eq\('status', 'active'\)/);
  assert.match(source, /\.eq\('is_active', true\)/);
});

test('local parent cache is write-only evidence, never routing authority', () => {
  assert.doesNotMatch(source, /AsyncStorage\.(getItem|multiGet)/);
  assert.match(source, /AsyncStorage\.setItem\('parent_profile_done', 'true'\)/);
  assert.match(source, /AsyncStorage\.multiSet/);
});

test('entry states fail closed for wrong side, incomplete profile, unverified guardian, and no link', () => {
  for (const state of ['wrong_side', 'profile_required', 'guardian_verification_required', 'parent_link_required']) {
    assert.match(source, new RegExp(`state: '${state}'`));
  }
  assert.match(source, /verification_state !== 'VERIFIED_GUARDIAN'/);
});

test('route map sends only ready parents into Parent Side', () => {
  assert.match(source, /case 'ready':[\s\S]*return '\/\(parent\)\/room'/);
  assert.match(source, /case 'parent_link_required':[\s\S]*return '\/\(onboarding\)\/parent-link'/);
  assert.match(source, /case 'guardian_verification_required':[\s\S]*return '\/\(auth\)\/guardian-verification'/);
});
