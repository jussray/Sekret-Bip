import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const session = fs.readFileSync(new URL('../src/services/session.ts', import.meta.url), 'utf8');

test('secure sign-out disables push, clears identity/private caches, resets consent, then ends authentication', () => {
  assert.match(session, /import \{ clearProfileIdentityCache \} from '@\/features\/identity\/clearProfileIdentityCache'/);
  assert.match(session, /import \{ consentService \} from '@\/services\/consentService'/);
  assert.match(session, /import \{ clearPrivateAccountCache \} from '@\/utils\/storage'/);

  const disableIndex = session.indexOf('await disableCurrentPushToken()');
  const identityIndex = session.indexOf('await clearProfileIdentityCache()');
  const clearIndex = session.indexOf('await clearPrivateAccountCache()');
  const consentIndex = session.indexOf('consentService.reset()');
  const signOutIndex = session.indexOf('await supabase.auth.signOut()');

  for (const index of [disableIndex, identityIndex, clearIndex, consentIndex, signOutIndex]) {
    assert.notEqual(index, -1);
  }
  assert.equal(disableIndex < identityIndex, true);
  assert.equal(identityIndex < clearIndex, true);
  assert.equal(clearIndex < consentIndex, true);
  assert.equal(consentIndex < signOutIndex, true);
});
