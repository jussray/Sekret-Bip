import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('mounted private state is bound to the permanent authenticated account', () => {
  const context = read('src/context/AppContext.tsx');
  const state = read('src/hooks/useSekretState.ts');

  assert.match(context, /useVerificationContext/);
  assert.match(context, /session && !session\.user\.is_anonymous \? session\.user\.id : null/);
  assert.match(context, /useSekretState\(authenticatedUserId\)/);
  assert.match(context, /previousUserId && previousUserId !== authenticatedUserId/);
  assert.match(context, /state\.resetAllState\(\)/);
  assert.match(context, /setTeenGender\(null\)/);
  assert.match(context, /consentService\.reset\(\)/);

  assert.match(state, /useSekretState\(authenticatedUserId: string \| null = null\)/);
  assert.match(state, /!authenticatedUserId/);
  assert.match(state, /user\.id !== authenticatedUserId/);
  assert.match(state, /\[authenticatedUserId, isLoading\]/);
});

test('sign-out still clears persisted private account caches below the UI layer', () => {
  const layout = read('app/_layout.tsx');
  const storage = read('src/utils/storage.ts');
  const session = read('src/services/session.ts');

  assert.match(layout, /onAuthStateChange/);
  assert.match(layout, /event !== 'SIGNED_OUT'/);
  assert.match(layout, /clearPrivateAccountCache\(\)/);
  assert.match(layout, /clearProfileIdentityCache\(\)/);
  assert.match(session, /await disableCurrentPushToken\(\)/);
  assert.match(session, /await supabase\.auth\.signOut\(\)/);
  assert.ok(session.indexOf('await disableCurrentPushToken()') < session.indexOf('await supabase.auth.signOut()'));

  for (const key of [
    'entries',
    'circlePosts',
    'roomMemory',
    'teen_profile_data',
    'bip_onboarding_side',
    'bip_onboarding_age',
    'sekretbip_saved_continuation_v1',
  ]) {
    assert.match(storage, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('all consent callers share the canonical server-backed singleton', () => {
  const compatibilityService = read('src/services/consentService.ts');
  const canonicalService = read('services/consentService.ts');
  const context = read('src/context/AppContext.tsx');

  assert.match(compatibilityService, /from '\.\.\/\.\.\/services\/consentService'/);
  assert.doesNotMatch(compatibilityService, /AsyncStorage/);
  assert.doesNotMatch(compatibilityService, /Supabase write failed.*cached locally/);
  assert.match(canonicalService, /reset\(\): void \{\s*cache\.clear\(\);\s*\}/);
  assert.match(context, /consentService\.reset\(\)/);
});

test('consent server reads fail closed and persistence receipts are exact', () => {
  const service = read('services/consentService.ts');

  const authGate = service.indexOf('if (authError || !user || user.id !== userId)');
  const clearBeforeRead = service.indexOf('cache.clear();', authGate);
  const serverRead = service.indexOf(".from('user_consents')", clearBeforeRead);
  assert.ok(authGate >= 0 && clearBeforeRead > authGate && serverRead > clearBeforeRead);

  assert.match(service, /if \(candidate\.category !== expectedCategory\)/);
  assert.match(service, /if \(candidate\.granted !== expectedGranted\)/);
  assert.match(service, /if \(candidate\.version !== CONSENT_VERSION\)/);
  assert.match(service, /consent_persistence_missing_timestamp/);
});
