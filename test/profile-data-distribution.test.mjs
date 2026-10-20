import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('identity readers keep private profile and Circle identity separate', () => {
  const identity = read('src/features/identity/profileIdentity.ts');
  assert.equal(identity.includes("getItem('teen_profile_data')"), true);
  assert.equal(identity.includes("getItem('teen_circle_identity')"), true);
  assert.equal(identity.includes('loadTeenPrivateProfile'), true);
  assert.equal(identity.includes('loadTeenCircleIdentity'), true);
});

test('Circle route reads only the Circle identity helper', () => {
  const circle = read('app/(teen)/circle/index.tsx');
  assert.equal(circle.includes('loadTeenCircleIdentity'), true);
  assert.equal(circle.includes('loadTeenPrivateProfile'), false);
  assert.equal(circle.includes('teen_profile_data'), false);
});

test('Circle shows the scoped Circle name without exposing the private name', () => {
  const circle = read('app/(teen)/circle/index.tsx');
  assert.equal(circle.includes('circleName'), true);
  assert.equal(circle.includes('Your Circle identity is separate from your private account'), true);
});

test('sign out clears teen and parent profile identities', () => {
  const cleanup = read('src/features/identity/clearProfileIdentityCache.ts');
  const layout = read('app/_layout.tsx');
  for (const key of [
    'teen_profile_done',
    'teen_profile_data',
    'teen_circle_identity',
    'parent_profile_done',
    'parent_profile_data',
    'parent_circle_identity',
    'bip_onboarding_gender',
    'bip_onboarding_companion',
  ]) {
    assert.equal(cleanup.includes(key), true);
  }
  assert.equal(layout.includes('clearProfileIdentityCache'), true);
  assert.equal(layout.includes('await clearPrivateAccountCache()'), true);
  assert.equal(layout.includes('await clearProfileIdentityCache()'), true);
});

// Keep this suite attached to the rebased PR head so CI validates current main.
