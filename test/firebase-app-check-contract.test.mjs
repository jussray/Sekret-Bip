import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(fullPath));
    else if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

test('Firebase App Check verifier uses strict project-number JWT validation', () => {
  const verifier = read('worker/firebase-app-check.ts');

  assert.ok(verifier.split('\n').some((line) => line.trim() === "const APP_CHECK_JWKS_URL = new URL('https://firebaseappcheck.googleapis.com/v1/jwks');"));
  assert.match(verifier, /FIREBASE_PROJECT_NUMBER/);
  assert.match(verifier, /issuer:\s*`\$\{APP_CHECK_ISSUER\}\/\$\{projectNumber\}`/);
  assert.match(verifier, /audience:\s*`projects\/\$\{projectNumber\}`/);
  assert.match(verifier, /algorithms:\s*\['RS256'\]/);
  assert.match(verifier, /typ:\s*'JWT'/);
  assert.match(verifier, /protectedHeader\.alg !== 'RS256'/);
  assert.match(verifier, /protectedHeader\.typ !== 'JWT'/);
  assert.match(verifier, /payload\.sub !== expectedAppId/);
  assert.match(verifier, /cacheMaxAge:\s*6 \* 60 \* 60 \* 1_000/);
  assert.doesNotMatch(verifier, /decodeJwt\s*\(/);
});

test('App Check remains inside the authoritative Worker front door and cannot replace authentication', () => {
  const frontDoor = read('worker/voice-entry.ts');
  const wrangler = read('wrangler.toml');

  assert.match(wrangler, /main = "worker\/voice-entry\.ts"/);
  assert.match(frontDoor, /verifyFirebaseAppCheck\(request, env\)/);
  assert.match(frontDoor, /authenticate\(request, env\)/);
  assert.match(frontDoor, /X-Firebase-AppCheck/);

  const authIndex = frontDoor.indexOf('authenticate(request, env)');
  const appCheckIndex = frontDoor.indexOf('verifyFirebaseAppCheck(request, env)');
  const rateLimitIndex = frontDoor.indexOf('enforceRateLimit(request, env, auth.principal, cors)');
  assert.ok(authIndex >= 0 && appCheckIndex > authIndex, 'Supabase/shared-token authentication must run before App Check');
  assert.ok(rateLimitIndex > appCheckIndex, 'App Check must be evaluated before protected execution/rate-limited dispatch');

  assert.doesNotMatch(frontDoor, /appCheck[^\n]*userId\s*=/i);
});

test('observe mode preserves traffic while enforce mode rejects only after cryptographic verification', () => {
  const frontDoor = read('worker/voice-entry.ts');
  const verifier = read('worker/firebase-app-check.ts');

  assert.match(verifier, /'off' \| 'observe' \| 'enforce'/);
  assert.match(verifier, /'disabled'/);
  assert.match(verifier, /'missing'/);
  assert.match(verifier, /'valid'/);
  assert.match(verifier, /'invalid'/);
  assert.match(verifier, /'verification_error'/);
  assert.match(frontDoor, /appCheckMode !== 'off'/);
  assert.match(frontDoor, /appCheckMode === 'enforce' && appCheck\.status !== 'valid'/);
  assert.match(frontDoor, /appCheckMode === 'invalid'/);
  assert.match(frontDoor, /appCheckDenied\(appCheck, cors\)/);
  assert.match(frontDoor, /result\.status === 'verification_error'/);
});

test('Cloudflare carries the App Check header without changing the checked-in default behavior', () => {
  const frontDoor = read('worker/voice-entry.ts');
  const wrangler = read('wrangler.toml');

  assert.match(frontDoor, /Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-AppCheck'/);
  assert.match(wrangler, /main = "worker\/voice-entry\.ts"/);
  assert.match(wrangler, /FIREBASE_APPCHECK_MODE = "off"/);
  assert.doesNotMatch(wrangler, /FIREBASE_PROJECT_NUMBER\s*=\s*"\d+"/);
  assert.doesNotMatch(wrangler, /FIREBASE_WEB_APP_ID\s*=\s*"1:/);
});

test('V1 mechanically blocks Firebase from becoming a second auth or data backend', () => {
  const roots = ['app', 'src', 'worker'].map((part) => path.join(root, part));
  const source = roots.flatMap(collectSourceFiles).map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  for (const prohibited of [
    'firebase/auth',
    'firebase/firestore',
    'firebase/database',
    'firebase/data-connect',
    'firebase/functions',
    'firebase/storage',
  ]) {
    assert.ok(!source.includes(prohibited), `prohibited Firebase backend import detected: ${prohibited}`);
  }
});
