import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('client App Check seam is optional, nonpersistent, and independent from Supabase auth', () => {
  const appCheck = read('src/services/appCheckToken.ts');
  const backendAuth = read('src/utils/backendAuth.ts');

  assert.match(appCheck, /registerAppCheckTokenProvider/);
  assert.match(appCheck, /getAppCheckToken/);
  assert.doesNotMatch(appCheck, /AsyncStorage|SecureStore|document\.cookie|Set-Cookie/);
  assert.doesNotMatch(appCheck, /firebase\/auth|firebase\/firestore|firebase\/database/);

  assert.match(backendAuth, /resolveBackendToken\(\)/);
  assert.match(backendAuth, /getAppCheckToken\(\)/);
  assert.match(backendAuth, /headers\['X-Firebase-AppCheck'\] = appCheckToken/);
  assert.match(backendAuth, /backendHeaders\(token, extra\)/);
  assert.doesNotMatch(backendAuth, /Authorization\s*=\s*appCheckToken/);
});

test('existing canonical Worker transport continues to source headers from backendAuthHeaders', () => {
  const client = read('src/services/backend/sekretClient.ts');
  assert.match(client, /headers:\s*await backendAuthHeaders\(\)/);
  assert.doesNotMatch(client, /X-Firebase-AppCheck/);
});
