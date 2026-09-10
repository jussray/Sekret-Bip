import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Firebase Hosting serves the existing Expo web export as an alternate static host', () => {
  const firebase = JSON.parse(read('firebase.json'));
  const aliases = JSON.parse(read('.firebaserc'));

  assert.deepEqual(Object.keys(firebase), ['hosting']);
  assert.equal(firebase.hosting.public, 'dist');
  assert.deepEqual(firebase.hosting.rewrites, [{ source: '**', destination: '/index.html' }]);
  assert.equal(aliases.projects.default, 'sekretbip-7e2b1');
});

test('Firebase Hosting config cannot replace canonical Cloudflare frontend or API authority', () => {
  const firebase = read('firebase.json');
  const eas = read('eas.json');
  const ownership = read('docs/CLOUDFLARE_OWNERSHIP.md');

  assert.doesNotMatch(firebase, /app\.sekretbip\.net|api\.sekretbip\.net/);
  assert.match(eas, /EXPO_PUBLIC_BACKEND_URL": "https:\/\/api\.sekretbip\.net"/);
  assert.match(ownership, /`sekret-bip` — Cloudflare Pages frontend project/);
  assert.match(ownership, /`sekret-backend` — canonical public API\/front-door/);
});
