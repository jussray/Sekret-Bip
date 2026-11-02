import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cloudflareHasErrorCode,
  cloudflareRequestFailure,
  safeCloudflareErrorReason,
} from '../scripts/cloudflare-provider-error.mjs';
import {
  appProbeIsFrontend,
  runtimeProbe,
  safeProbeUrl,
  safeProbeContentType,
  safeRuntimeBodyFingerprint,
} from '../scripts/reconcile-cloudflare-app-domain.mjs';
import { buildSafeEmailRoutingReceipt } from '../scripts/reconcile-cloudflare-email-routing.mjs';

const providerSecret = 'fake-only-provider-secret-DO-NOT-LOG';
const privateEmail = 'private.fixture@example.invalid';

test('Cloudflare errors expose only bounded HTTP status and numeric provider codes', () => {
  const failure = cloudflareRequestFailure({
    success: false,
    errors: [
      { code: 6003, message: `invalid token ${providerSecret} ${privateEmail}` },
      { code: 'untrusted-dynamic-message', message: providerSecret },
      { code: 10000, message: 'response body must not be retained' },
    ],
  }, 403);
  assert.equal(failure.message, 'CLOUDFLARE_PROVIDER_REQUEST_FAILED status=403 codes=6003,10000');
  assert.equal(safeCloudflareErrorReason(failure), 'CLOUDFLARE_PROVIDER_REQUEST_FAILED status=403 codes=6003,10000');
  assert.equal(cloudflareHasErrorCode(failure, 6003), true);
  assert.equal(cloudflareHasErrorCode(failure, 9999), false);
  assert.doesNotMatch(JSON.stringify(failure.message), /fake-only-provider-secret|private\.fixture@/);
  const tagged = cloudflareRequestFailure({ errors: [{ code: 6003, message: providerSecret }] }, 403, 'token-verify');
  assert.equal(tagged.message, 'CLOUDFLARE_PROVIDER_REQUEST_FAILED status=403 codes=6003 operation=token-verify');
  assert.equal(safeCloudflareErrorReason(tagged), tagged.message);
  const dynamicTag = cloudflareRequestFailure({ errors: [] }, 403, providerSecret);
  assert.doesNotMatch(dynamicTag.message, /operation=|fake-only-provider-secret/);
});

test('arbitrary provider exceptions cannot inject log text or evidence', () => {
  const hostile = new Error(`BAD: ${providerSecret} account ${privateEmail}`);
  assert.equal(safeCloudflareErrorReason(hostile), 'CLOUDFLARE_OPERATION_FAILED');
  assert.equal(safeCloudflareErrorReason(null), 'CLOUDFLARE_OPERATION_FAILED');
  assert.equal(cloudflareRequestFailure({ errors: [{ code: -1, message: providerSecret }] }, 900).message,
    'CLOUDFLARE_PROVIDER_REQUEST_FAILED status=unknown');
});

test('runtime frontend probes retain classifications, never page HTML or private content', () => {
  assert.equal(safeRuntimeBodyFingerprint(`<html>${providerSecret} ${privateEmail}</html>`), 'unclassified');
  assert.equal(safeRuntimeBodyFingerprint(`Cloudflare Access Sign in ${providerSecret}`), 'cloudflare access login');
  assert.equal(safeRuntimeBodyFingerprint(`{"error" : "Method not allowed", "token":"${providerSecret}"}`),
    '"error":"Method not allowed"');
});


test('probe receipts retain origins only and preserve Cloudflare Access redirect detection', async () => {
  const requested = 'https://reader:private-password@app.sekretbip.net/welcome?session=fixture-private#secret';
  const final = 'https://tenant.cloudflareaccess.com/cdn-cgi/access/login?state=fixture-private&code=123';
  assert.equal(safeProbeUrl(requested), 'https://app.sekretbip.net');
  assert.equal(safeProbeUrl('file:///private/fixture-secret'), 'unverified-url');
  assert.equal(safeProbeUrl('unparseable-credential-fixture'), 'unverified-url');

  const probe = await runtimeProbe(requested, async (url, options) => {
    assert.equal(url, requested);
    assert.deepEqual(options, { redirect: 'follow' });
    return {
      url: final,
      redirected: true,
      status: 200,
      headers: { get: () => 'text/html; charset=UTF-8' },
      text: async () => '<html>generic page without an Access label</html>',
    };
  });
  assert.equal(probe.requestedUrl, 'https://app.sekretbip.net');
  assert.equal(probe.finalUrl, 'https://tenant.cloudflareaccess.com');
  assert.equal(probe.accessRedirect, true);
  assert.equal(appProbeIsFrontend(probe), false);
  assert.doesNotMatch(JSON.stringify(probe), /fixture-private|private-password|state=|code=123/);

  const sameHostAccess = await runtimeProbe('https://app.sekretbip.net/', async () => ({
    url: 'https://app.sekretbip.net/cdn-cgi/access/login?state=fixture-private',
    redirected: true,
    status: 200,
    headers: { get: () => 'text/html' },
    text: async () => '<main>generic redirect</main>',
  }));
  assert.equal(sameHostAccess.accessRedirect, true);
  assert.equal(appProbeIsFrontend(sameHostAccess), false);
  assert.doesNotMatch(JSON.stringify(sameHostAccess), /fixture-private|cdn-cgi/);

  const offOrigin = await runtimeProbe('https://app.sekretbip.net/welcome?state=fixture-private', async () => ({
    url: 'https://unrelated.example.invalid/any-page?state=fixture-private',
    redirected: true,
    status: 200,
    headers: { get: () => 'text/html' },
    text: async () => '<html>Generic HTML that must not prove Pages readiness</html>',
  }));
  assert.equal(offOrigin.accessRedirect, false);
  assert.equal(offOrigin.finalUrl, 'https://unrelated.example.invalid');
  assert.equal(appProbeIsFrontend(offOrigin), false);
  assert.doesNotMatch(JSON.stringify(offOrigin), /state=|fixture-private/);

  const sameOrigin = await runtimeProbe('https://app.sekretbip.net/health?token=fixture-private', async () => ({
    url: 'https://app.sekretbip.net/welcome?token=fixture-private',
    redirected: true,
    status: 200,
    headers: { get: () => 'text/html; charset=UTF-8; marker=fixture-private' },
    text: async () => '<html>Valid frontend page</html>',
  }));
  assert.equal(appProbeIsFrontend(sameOrigin), true);
  assert.doesNotMatch(JSON.stringify(sameOrigin), /token=|fixture-private/);

  const missingFinalUrl = await runtimeProbe('https://app.sekretbip.net/', async () => ({
    url: '',
    redirected: true,
    status: 200,
    headers: { get: () => 'text/html' },
    text: async () => '<html>Unverifiable redirect</html>',
  }));
  assert.equal(missingFinalUrl.finalUrl, 'unverified-url');
  assert.equal(appProbeIsFrontend(missingFinalUrl), false);
});

test('Pages readiness requires 2xx HTML and redacts arbitrary MIME header parameters', () => {
  assert.equal(safeProbeContentType('text/html; charset=UTF-8; token=fixture-private'), 'text/html');
  assert.equal(safeProbeContentType('application/json; token=fixture-private'), 'application/json');
  assert.equal(safeProbeContentType('text/plain; token=fixture-private'), 'other');
  assert.equal(safeProbeContentType(''), 'other');

  const proof = {
    url: 'https://app.sekretbip.net',
    requestedUrl: 'https://app.sekretbip.net',
    finalUrl: 'https://app.sekretbip.net',
    accessRedirect: false,
    status: 200,
    contentType: 'text/html',
    bodyFingerprint: 'unclassified',
  };
  assert.equal(appProbeIsFrontend(proof), true);
  assert.equal(appProbeIsFrontend({ ...proof, status: 302 }), false);
  assert.equal(appProbeIsFrontend({ ...proof, status: 204, contentType: 'other' }), false);
  assert.equal(appProbeIsFrontend({ ...proof, contentType: 'text/plain' }), false);
  assert.equal(appProbeIsFrontend({ ...proof, contentType: 'application/json' }), false);
});

test('email routing evidence writer retains fixed Sauce Guard logging', () => {
  const source = readFileSync(new URL('../scripts/reconcile-cloudflare-email-routing.mjs', import.meta.url), 'utf8');
  assert.match(source, /console\.log\('CLOUDFLARE_EMAIL_ROUTING_EVIDENCE_WRITTEN'\)/);
  assert.doesNotMatch(source, /console\.log\(`EVIDENCE_WRITTEN phase=/);
});

test('email-routing receipt excludes raw provider recipient, catch-all and action data', () => {
  const fixtureSecret = 'fixture-private-recipient@example.invalid';
  const receipt = buildSafeEmailRoutingReceipt({
    config: { zoneName: 'sekretbip.net', workerName: 'sekret-backend' },
    phase: 'pre-apply',
    now: () => new Date('2026-10-24T00:00:00.000Z'),
    dns: { enabled: true, status: 'ready', name: fixtureSecret },
    destination: { email: fixtureSecret, verified: true },
    catchAll: {
      enabled: false,
      matchers: [{ type: 'literal', value: fixtureSecret }],
      actions: [{ type: 'forward', value: [fixtureSecret] }],
    },
    rules: [
      {
        id: fixtureSecret,
        name: fixtureSecret,
        enabled: true,
        matchers: [{ type: 'literal', field: 'to', value: 'hello@sekretbip.net' }],
        actions: [{ type: 'worker', value: ['sekret-backend'] }],
      },
      {
        id: fixtureSecret,
        name: fixtureSecret,
        enabled: true,
        matchers: [{ type: 'literal', field: 'to', value: fixtureSecret }],
        actions: [{ type: 'forward', value: [fixtureSecret] }],
      },
    ],
  });
  assert.deepEqual(receipt.destination, { configured: true, verified: true });
  assert.deepEqual(receipt.catchAll, { enabled: false });
  assert.deepEqual(receipt.rules, [
    { alias: 'hello', enabled: true, canonicalWorker: true },
    { alias: null, enabled: true, canonicalWorker: false },
  ]);
  assert.deepEqual(receipt.routingDns, { enabled: true, ready: true });
  assert.doesNotMatch(JSON.stringify(receipt), /fixture-private-recipient|example\\.invalid|matchers|actions/);
});

test('provider reconciliation entrypoints do not echo raw provider errors or runtime response snippets', () => {
  for (const path of [
    'scripts/reconcile-cloudflare-app-domain.mjs',
    'scripts/reconcile-cloudflare-resend-dns.mjs',
    'scripts/reconcile-cloudflare-email-routing.mjs',
    'scripts/reconcile-cloudflare-workers-build-trigger.mjs',
  ]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    if (path.endsWith('reconcile-cloudflare-workers-build-trigger.mjs')) {
      assert.match(source,
        /cloudflareRequestFailure\(payload, response\.status, safeWorkerRequestOperation\(requestPath\)\)/,
        path);
      assert.match(source, /return 'token-verify'/);
      assert.match(source, /return 'workers-scripts-read'/);
      assert.match(source, /return 'workers-ci-read'/);
    } else {
      assert.match(source, /cloudflareRequestFailure\(payload, response\.status\)/, path);
    }
    assert.doesNotMatch(source, /errorText\(payload|response\.statusText/, path);
  }
  const app = readFileSync(new URL('../scripts/reconcile-cloudflare-app-domain.mjs', import.meta.url), 'utf8');
  assert.match(app, /bodyFingerprint: safeRuntimeBodyFingerprint\(body\)/);
  assert.doesNotMatch(app, /bodyFingerprint:\s*body\.replace/);
  assert.match(app, /console\.log\('CLOUDFLARE_APP_DOMAIN_PLAN_READY'\)/);
  assert.doesNotMatch(app, /console\.log\(\s*JSON\.stringify/);

  for (const path of ['scripts/reconcile-cloudflare-resend-dns.mjs', 'scripts/reconcile-cloudflare-email-routing.mjs']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /console\.error\(error instanceof Error \? error\.message : error\)/, path);
  }
});
