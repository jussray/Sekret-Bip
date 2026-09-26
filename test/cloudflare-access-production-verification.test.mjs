import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {resolveCloudflareAccessServiceAuth} from '../scripts/cloudflare-access-service-auth.mjs';
import {probeJsonEndpoint} from '../scripts/probe-production-release-endpoints.mjs';

function mockHeaders(values = {}) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => normalized.get(String(name).toLowerCase()) ?? null };
}

test('Access service auth is optional but must be configured as a complete pair', () => {
  assert.deepEqual(resolveCloudflareAccessServiceAuth({}), {configured: false, headers: {}});

  assert.throws(
    () => resolveCloudflareAccessServiceAuth({CLOUDFLARE_ACCESS_CLIENT_ID: 'client-id'}),
    /must be configured together/,
  );
  assert.throws(
    () => resolveCloudflareAccessServiceAuth({CLOUDFLARE_ACCESS_CLIENT_SECRET: 'client-secret'}),
    /must be configured together/,
  );
});

test('Access credentials are sent to intentionally protected probes but never retained in probe evidence', async () => {
  const clientId = 'opaque-access-client-id-fixture';
  const clientSecret = 'opaque-access-client-secret-fixture';
  const accessAuth = resolveCloudflareAccessServiceAuth({
    CLOUDFLARE_ACCESS_CLIENT_ID: clientId,
    CLOUDFLARE_ACCESS_CLIENT_SECRET: clientSecret,
  });

  let observedHeaders = null;
  const probe = await probeJsonEndpoint('https://app.sekretbip.net/.well-known/sekret-release.json', {
    accessAuth,
    fetchImpl: async (_url, options) => {
      observedHeaders = options.headers;
      return {
        status: 200,
        ok: true,
        url: 'https://app.sekretbip.net/.well-known/sekret-release.json',
        redirected: false,
        headers: mockHeaders({'content-type': 'application/json'}),
        async json() {
          return {commitSha: 'a'.repeat(40)};
        },
      };
    },
  });

  assert.equal(observedHeaders['CF-Access-Client-Id'], clientId);
  assert.equal(observedHeaders['CF-Access-Client-Secret'], clientSecret);
  assert.equal(probe.accessServiceAuthConfigured, true);
  const retained = JSON.stringify(probe);
  assert.equal(retained.includes(clientId), false);
  assert.equal(retained.includes(clientSecret), false);
});

test('public production browser verification is anonymous and cannot inherit Access service auth', () => {
  const config = fs.readFileSync('playwright.production.config.ts', 'utf8');
  assert.doesNotMatch(config, /resolveCloudflareAccessServiceAuth/);
  assert.doesNotMatch(config, /extraHTTPHeaders/);
  assert.doesNotMatch(config, /CF-Access-Client-(?:Id|Secret)/);
  assert.match(config, /trace: 'on-first-retry'/);
  assert.match(config, /production-public-front-door\.spec\.ts/);
});

test('production workflow reads any machine Access credentials only from protected secrets', () => {
  const workflow = fs.readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8');
  assert.match(workflow, /CLOUDFLARE_ACCESS_CLIENT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCESS_CLIENT_ID \}\}/);
  assert.match(workflow, /CLOUDFLARE_ACCESS_CLIENT_SECRET: \$\{\{ secrets\.CLOUDFLARE_ACCESS_CLIENT_SECRET \}\}/);
  assert.doesNotMatch(workflow, /opaque-access-client-(?:id|secret)-fixture/);
});
