import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function collectStringValues(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
    return output;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStringValues(item, output);
  }
  return output;
}

test('Firebase Hosting serves the existing Expo web export as an alternate static host', () => {
  const firebase = JSON.parse(read('firebase.json'));
  const aliases = JSON.parse(read('.firebaserc'));

  assert.deepEqual(Object.keys(firebase), ['hosting']);
  assert.equal(firebase.hosting.public, 'dist');
  assert.deepEqual(firebase.hosting.rewrites, [{ source: '**', destination: '/index.html' }]);
  assert.equal(aliases.projects.default, 'sekretbip-7e2b1');
});

test('Firebase Hosting config cannot replace canonical Cloudflare frontend or API authority', () => {
  const firebase = JSON.parse(read('firebase.json'));
  const firebaseValues = new Set(collectStringValues(firebase));
  const eas = JSON.parse(read('eas.json'));
  const ownership = read('docs/CLOUDFLARE_OWNERSHIP.md');

  assert.equal(firebaseValues.has('app.sekretbip.net'), false);
  assert.equal(firebaseValues.has('api.sekretbip.net'), false);
  assert.equal(eas.build.development.env.EXPO_PUBLIC_BACKEND_URL, 'https://api.sekretbip.net');
  assert.equal(eas.build['parent-development'].env.EXPO_PUBLIC_BACKEND_URL, 'https://api.sekretbip.net');
  assert.equal(eas.build.production.env.EXPO_PUBLIC_BACKEND_URL, 'https://api.sekretbip.net');
  assert.equal(eas.build['parent-production'].env.EXPO_PUBLIC_BACKEND_URL, 'https://api.sekretbip.net');
  assert.match(ownership, /`sekret-bip` — Cloudflare Pages frontend project/);
  assert.match(ownership, /`sekret-backend` — canonical public API\/front-door/);
});
