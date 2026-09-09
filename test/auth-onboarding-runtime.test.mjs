import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const rootLayout = read('app/_layout.tsx');
const index = read('app/index.tsx');
const age = read('app/(onboarding)/age.tsx');
const login = read('app/(auth)/login.tsx');
const signup = read('app/(auth)/signup.tsx');
const consent = read('app/(onboarding)/consent.tsx');
const reflection = read('app/(onboarding)/reflection.tsx');
const parentSetup = read('app/(onboarding)/parent-setup.tsx');
const bootstrap = read('src/services/auth/postAuthBootstrap.ts');
const ageAssurance = read('src/features/onboarding/ageAssurance.ts');
const manifest = JSON.parse(read('.control-room/repository.manifest.json'));

test('splash and safe pre-auth onboarding routes are reachable before login', () => {
  assert.match(rootLayout, /PUBLIC_ONBOARDING_SEGMENTS/);
  assert.match(rootLayout, /'welcome'/);
  assert.match(rootLayout, /'age'/);
  assert.match(rootLayout, /const isPublicRoot = first === ''/);
  assert.match(rootLayout, /if \(session \|\| event !== 'SIGNED_OUT'\) return;/);
  assert.doesNotMatch(index, /if \(!user\) \{\s*router\.replace\('\/\(auth\)\/login'\)/);
  assert.match(index, /const publicEntrySide: AccountSide = selectedEntrySide \?\? previewSide \?\? buildSide \?\? userSide \?\? 'teen'/);
  assert.match(index, /router\.replace\(publicEntrySide === 'parent' \? '\/\(onboarding\)\/parent-splash' : '\/\(onboarding\)\/welcome'\)/);
  assert.match(index, /setSelectedEntrySide\(side\)/);
});

test('age and account side survive into permanent account creation', () => {
  assert.match(age, /\[AGE_ASSURANCE_STORAGE_KEYS\.bucket, ageDecision\.ageBucket\]/);
  assert.match(age, /\[ONBOARDING_SIDE_KEY, ageDecision\.nextSide\]/);
  assert.match(age, /router\.push\(decision\.nextRoute as never\)/);
  assert.match(ageAssurance, /\/\(auth\)\/signup\?side=teen/);
  assert.match(age, /ONBOARDING_SIDE_KEY, 'parent'/);
  assert.match(signup, /useLocalSearchParams<\{ side\?: string \}>/);
  assert.match(signup, /AsyncStorage\.setItem\(ONBOARDING_SIDE_KEY, preferredSide\)/);
});

test('login normalizes structured transport failures before rendering', () => {
  assert.match(login, /function authErrorMessage\(error: unknown\): string/);
  assert.match(login, /message\.includes\('failed to fetch'\)/);
  assert.match(login, /setError\(readableAuthError\(authErr\)\)/);
  assert.doesNotMatch(login, /setError\(authErr\.message\)/);
});

test('login and signup wait for the same post-auth fetch contract before routing', () => {
  const signInIndex = login.indexOf('signInWithPassword');
  const loginBootstrapIndex = login.indexOf('const bootstrap = await fetchPostAuthBootstrap', signInIndex);
  const loginRouteIndex = login.indexOf('router.replace(bootstrap.nextRoute', loginBootstrapIndex);
  assert.ok(signInIndex >= 0 && loginBootstrapIndex > signInIndex && loginRouteIndex > loginBootstrapIndex);

  const signUpIndex = signup.indexOf('sb.auth.signUp');
  const signupBootstrapIndex = signup.indexOf('const bootstrap = await fetchPostAuthBootstrap');
  assert.ok(signUpIndex >= 0 && signupBootstrapIndex >= 0);
  assert.match(signup, /await refreshVerification\(\)/);

  assert.match(bootstrap, /hydrateAccountProfile/);
  assert.match(bootstrap, /consentService\.load/);
  assert.match(bootstrap, /requiredConsentsComplete/);
  assert.match(bootstrap, /A permanent signed-in account is required/);
});

test('profile hydration failure preserves auth and fails closed through onboarding', () => {
  assert.match(bootstrap, /async function hydrateAccountProfileForRouting/);
  assert.match(
    bootstrap,
    /try \{\s*return await hydrateAccountProfile\(preferredSide\);\s*\} catch \{[\s\S]*return null;\s*\}/,
  );
  assert.match(
    bootstrap,
    /prehydratedProfile === undefined\s*\? await hydrateAccountProfileForRouting\(requestedSide\)/,
  );
  assert.match(bootstrap, /if \(!requiredConsentsComplete\) return `\/\(onboarding\)\/consent\?side=\$\{side\}`;/);
});

test('authorized founder login routes before public consent and onboarding gates', () => {
  const founderLookupIndex = bootstrap.indexOf('const founderProfile = await getCurrentFounderProfile()');
  const founderRouteIndex = bootstrap.indexOf("nextRoute: '/(dev)/control-room'");
  const profileHydrationIndex = bootstrap.indexOf('const profile = prehydratedProfile === undefined');
  const consentLoadIndex = bootstrap.indexOf('await consentService.load(user.id)');

  assert.match(bootstrap, /isFounderProfile\(founderProfile\)/);
  assert.ok(founderLookupIndex >= 0);
  assert.ok(founderRouteIndex > founderLookupIndex);
  assert.ok(profileHydrationIndex > founderRouteIndex);
  assert.ok(consentLoadIndex > founderRouteIndex);
  assert.match(bootstrap, /requiredConsentsComplete: false/);
});

test('required consent is explicit, persisted, and not inferred from navigation', () => {
  assert.match(consent, /accessibilityRole="checkbox"/);
  assert.match(consent, /I reviewed the Privacy Policy/);
  assert.match(consent, /I agree to the Terms of Service/);
  assert.match(consent, /consentService\.grant\(userId, 'privacyPolicy'\)/);
  assert.match(consent, /consentService\.grant\(userId, 'termsOfService'\)/);
  assert.match(consent, /if \(!consentService\.hasCompletedOnboarding\(\)\)/);
  assert.match(consent, /Nothing is recorded until you check both boxes and press Continue/);

  const effectRegion = consent.slice(consent.indexOf('useEffect'), consent.indexOf('async function openPolicy'));
  assert.doesNotMatch(effectRegion, /consentService\.grant/);
  assert.match(reflection, /fetchPostAuthBootstrap\('teen'\)/);
  assert.match(parentSetup, /fetchPostAuthBootstrap\('parent'\)/);
});

test('Control Room proof points to the real consent action', () => {
  const capability = manifest.capabilities.find(item => item.id === 'consent-audit-runtime-truth');
  const assertion = capability.usageAssertions.find(item => item.id === 'onboarding-requires-explicit-consent-action');
  assert.equal(assertion.path, 'app/(onboarding)/consent.tsx');
  assert.equal(assertion.marker, 'consentService.grant');
});
