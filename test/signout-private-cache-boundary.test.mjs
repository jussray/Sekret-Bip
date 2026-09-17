import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const session = fs.readFileSync(new URL('../src/services/session.ts', import.meta.url), 'utf8');

test('secure sign-out disables push, clears private cache, then ends authentication', () => {
  assert.match(session, /import \{ clearPrivateAccountCache \} from '@\/utils\/storage'/);

  const disableIndex = session.indexOf('await disableCurrentPushToken()');
  const clearIndex = session.indexOf('await clearPrivateAccountCache()');
  const signOutIndex = session.indexOf('await supabase.auth.signOut()');

  assert.notEqual(disableIndex, -1);
  assert.notEqual(clearIndex, -1);
  assert.notEqual(signOutIndex, -1);
  assert.equal(disableIndex < clearIndex, true);
  assert.equal(clearIndex < signOutIndex, true);
});
