import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cloudflareHasErrorCode,
  cloudflareRequestFailure,
  safeCloudflareErrorReason,
} from '../scripts/cloudflare-provider-error.mjs';
import { safeRuntimeBodyFingerprint } from '../scripts/reconcile-cloudflare-app-domain.mjs';

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

test('provider reconciliation entrypoints do not echo raw provider errors or runtime response snippets', () => {
  for (const path of [
    'scripts/reconcile-cloudflare-app-domain.mjs',
    'scripts/reconcile-cloudflare-resend-dns.mjs',
    'scripts/reconcile-cloudflare-email-routing.mjs',
    'scripts/reconcile-cloudflare-workers-build-trigger.mjs',
  ]) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(source, /cloudflareRequestFailure\(payload, response\.status\)/, path);
    assert.doesNotMatch(source, /errorText\(payload|response\.statusText/, path);
  }
  const app = readFileSync(new URL('../scripts/reconcile-cloudflare-app-domain.mjs', import.meta.url), 'utf8');
  assert.match(app, /bodyFingerprint: safeRuntimeBodyFingerprint\(body\)/);
  assert.doesNotMatch(app, /bodyFingerprint:\s*body\.replace/);
  for (const path of ['scripts/reconcile-cloudflare-resend-dns.mjs', 'scripts/reconcile-cloudflare-email-routing.mjs']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /console\.error\(error instanceof Error \? error\.message : error\)/, path);
  }
});
