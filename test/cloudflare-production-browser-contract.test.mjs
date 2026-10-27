import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const analytics = read('components/Analytics.web.tsx');
const productionConfig = read('playwright.production.config.ts');
const productionFrontDoor = read('e2e/production-public-front-door.spec.ts');
const productionSmoke = read('e2e/production-smoke.spec.ts');
const productionAuth = read('e2e/production-auth-reachability.spec.ts');
const productionSignup = read('e2e/production-signup-transport.spec.ts');

test('Cloudflare production does not inject the Vercel analytics runtime', () => {
  assert.doesNotMatch(analytics, /@vercel\/analytics/);
  assert.doesNotMatch(analytics, /VercelAnalytics/);
  assert.match(analytics, /return null/);
});

test('production Playwright runs only launch-safe exact-domain specs', () => {
  for (const spec of [
    'production-public-front-door.spec.ts',
    'production-smoke.spec.ts',
    'production-auth-reachability.spec.ts',
    'production-password-recovery.spec.ts',
    'production-signup-transport.spec.ts',
  ]) {
    assert.match(productionConfig, new RegExp(spec.replaceAll('.', '\\.')));
  }
  assert.match(productionConfig, /testMatch/);
  assert.doesNotMatch(productionConfig, /live-onboarding-email\.spec\.ts/);
});

test('public production browser proof is anonymous and fails on Cloudflare Access navigation', () => {
  assert.doesNotMatch(productionConfig, /resolveCloudflareAccessServiceAuth/);
  assert.doesNotMatch(productionConfig, /extraHTTPHeaders/);
  assert.match(productionFrontDoor, /documentNavigations/);
  assert.match(productionFrontDoor, /cloudflareaccess\.com/);
  assert.match(productionFrontDoor, /\/cdn-cgi\/access\//);
  assert.match(productionFrontDoor, /web-welcome-enter/);
  assert.match(productionFrontDoor, /https:\/\/sekretbip\.net\//);
  assert.match(productionFrontDoor, /hostname\)\.toBe\('sekretbip\.net'\)/);
  assert.doesNotMatch(productionFrontDoor, /app\.sekretbip\.net/);
});

test('production launch proof binds Pages and Worker to the same release', () => {
  assert.match(productionSmoke, /schemaVersion:\s*2/);
  assert.match(productionSmoke, /\.well-known\/sekret-release\.json/);
  assert.match(productionSmoke, /https:\/\/api\.sekretbip\.net\/health/);
  assert.match(productionSmoke, /releaseSha:\s*expectedReleaseSha/);
  assert.match(productionSmoke, /YOUR PEOPLE\. YOUR PEACE\./);
  assert.match(productionSmoke, /YOUR FAMILY\. YOUR SPACE\./);
  assert.doesNotMatch(productionSmoke, /THE SOFTER ORIGINAL/);
  assert.doesNotMatch(productionSmoke, /toHaveText\('Suhana'\)/);
});

test('production Auth and signup checks stay public-safe and age-first', () => {
  assert.match(productionAuth, /\/auth\/v1\/settings/);
  assert.doesNotMatch(productionAuth, /\/rest\/v1\//);
  assert.match(productionAuth, /withoutKey/);
  assert.match(productionSignup, /How old are you\?/);
  assert.match(productionSignup, /13\\s\*\[–-\]\\s\*15 Teen mode starts/);
  assert.match(productionSignup, /No request from this test may reach real production Auth/);
});
