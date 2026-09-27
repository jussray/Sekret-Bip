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

test('the consent singleton has an explicit sign-out reset contract and is consumed', () => {
  const service = read('src/services/consentService.ts');
  const context = read('src/context/AppContext.tsx');

  assert.match(service, /reset\(\): void/);
  assert.match(service, /this\.granted\.clear\(\)/);
  assert.match(context, /consentService\.reset\(\)/);
});
