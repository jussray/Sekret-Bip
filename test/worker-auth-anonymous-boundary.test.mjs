import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const authSource = fs.readFileSync(path.join(root, 'worker/auth.ts'), 'utf8');

test('Worker rejects anonymous Supabase JWTs before creating a user principal', () => {
  const anonymousGuard = authSource.indexOf("payload?.is_anonymous === true");
  const anonymousDenial = authSource.indexOf("error: 'anonymous user token not permitted'");
  const userPrincipal = authSource.indexOf("principal: { kind: 'user', userId: payload.sub }");

  assert.ok(anonymousGuard >= 0, 'anonymous Supabase JWT guard must exist');
  assert.ok(anonymousDenial > anonymousGuard, 'anonymous JWT guard must return a denial');
  assert.ok(userPrincipal > anonymousDenial, 'anonymous JWT denial must happen before user-principal creation');
  assert.match(authSource, /return \{ ok: false, status: 403, error: 'anonymous user token not permitted' \};/);
});

test('explicit shared guest credential remains a separate allowed principal', () => {
  const jwtBranch = authSource.indexOf('if (token && hasJwtVerifier && looksLikeJwt(token))');
  const sharedBranch = authSource.indexOf('if (token && sharedToken && timingSafeEqual(token, sharedToken))');

  assert.ok(jwtBranch >= 0, 'Supabase JWT branch must exist');
  assert.ok(sharedBranch > jwtBranch, 'shared guest-token path must remain separate from JWT authentication');
  assert.match(authSource, /principal: \{ kind: 'shared-token' \}/);
});
