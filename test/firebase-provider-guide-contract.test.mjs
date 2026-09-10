import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const providers = fs.readFileSync('docs/PROVIDERS.md', 'utf8');

test('Firebase project identity and app boundaries are durable project truth', () => {
  assert.match(providers, /Firebase project: `sekretbip-7e2b1`/);
  assert.match(providers, /canonical teen Apple\/iOS bundle identifier: `com\.sekretbip\.app`/);
  assert.match(providers, /parent Apple\/iOS bundle identifier: `com\.sekretbip\.parent`/);
  assert.match(providers, /do not collapse or silently reuse one Firebase App ID/i);
  assert.match(providers, /Never guess, fabricate, or derive them from the bundle identifier/i);
});

test('Firebase remains subordinate to Supabase identity and data authority', () => {
  assert.match(providers, /Firebase is a bounded supporting provider/);
  assert.match(providers, /Firebase must not become Se’kret Bip Auth, Firestore, Realtime Database/);
  assert.match(providers, /Supabase authentication is evaluated independently from Firebase App Check/);
  assert.match(providers, /cannot create a principal, replace an Authorization bearer token, weaken RLS/);
});

test('App Check rollout stays observe-before-enforce with a reversible off state', () => {
  assert.match(providers, /off\s*\n→ bind authenticated provider identities\s*\n→ acquire real client token\s*\n→ observe/);
  assert.match(providers, /`FIREBASE_APPCHECK_MODE = "off"` is the checked-in safe default/);
  assert.match(providers, /`enforce` is forbidden until/i);
  assert.match(providers, /must not be persisted in AsyncStorage, SecureStore, cookies/i);
});

test('Firebase Hosting cannot silently become canonical Se’kret authority', () => {
  assert.match(providers, /Firebase Hosting serves the existing Expo static web output from `dist`/);
  assert.match(providers, /Do not bind, transfer, replace, or infer ownership of `app\.sekretbip\.net`, `api\.sekretbip\.net`/);
  assert.match(providers, /A Firebase Hosting deployment proves only that the Firebase-hosted artifact was deployed/);
  assert.match(providers, /Missing evidence at one layer stays `UNKNOWN` or `BLOCKED`/);
});
