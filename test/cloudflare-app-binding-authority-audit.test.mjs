import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  auditCloudflareAppBindingAuthority,
  classifyRuntimeProbe,
} from '../scripts/audit-cloudflare-app-binding-authority.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const ZONE_ID = 'fedcba9876543210fedcba9876543210';
const TOKEN = 'provider-token-must-not-be-retained';

function jsonResponse(result, { ok = true, status = 200, errors = [] } = {}) {
  return {
    ok,
    status,
    url: 'https://api.cloudflare.com/client/v4/mock',
    redirected: false,
    headers: { get: () => 'application/json' },
    async json() {
      return ok ? { success: true, result } : { success: false, errors };
    },
    async text() {
      return JSON.stringify(ok ? { success: true, result } : { success: false, errors });
    },
  };
}

function runtimeResponse({ status, url, contentType, body, redirected = false }) {
  return {
    ok: status >= 200 && status < 400,
    status,
    url,
    redirected,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : null },
    async json() {
      return JSON.parse(body);
    },
    async text() {
      return body;
    },
  };
}

test('records exact front-door provider ownership and runtime shape without mutating or retaining credentials', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-app-binding-audit-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const calls = [];

  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: String(options.method || 'GET').toUpperCase() });

    if (url.endsWith(`/zones/${ZONE_ID}`)) {
      return jsonResponse({ id: ZONE_ID, name: 'sekretbip.net', account: { id: ACCOUNT_ID } });
    }
    if (url.endsWith(`/accounts/${ACCOUNT_ID}/pages/projects/sekret-bip/domains`)) {
      return jsonResponse([
        { id: 'pages-domain-id', name: 'app.sekretbip.net', status: 'active' },
        { id: 'other-pages-domain', name: 'welcome.sekretbip.net', status: 'active' },
      ]);
    }
    if (url.includes(`/accounts/${ACCOUNT_ID}/workers/domains?hostname=app.sekretbip.net`)) {
      return jsonResponse([
        { id: 'worker-domain-id', hostname: 'app.sekretbip.net', service: 'sekret-backend', zone_id: ZONE_ID },
        { id: 'other-domain-id', hostname: 'api.sekretbip.net', service: 'sekret-backend', zone_id: ZONE_ID },
      ]);
    }
    if (url.endsWith(`/zones/${ZONE_ID}/workers/routes`)) {
      return jsonResponse([
        { id: 'exact-route-id', pattern: 'app.sekretbip.net/*', script: 'sekret-backend' },
        { id: 'broad-route-id', pattern: '*.sekretbip.net/*', script: 'sekret' },
        { id: 'api-route-id', pattern: 'api.sekretbip.net/*', script: 'sekret-backend' },
      ]);
    }
    if (url === 'https://app.sekretbip.net') {
      return runtimeResponse({
        status: 405,
        url,
        contentType: 'application/json; charset=utf-8',
        body: '{"error":"Method not allowed"}',
      });
    }
    if (url === 'https://api.sekretbip.net/health') {
      return runtimeResponse({
        status: 200,
        url,
        contentType: 'application/json; charset=utf-8',
        body: '{"ok":true,"worker":"sekret-backend","private":"must-not-be-retained"}',
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const receipt = await auditCloudflareAppBindingAuthority({
    env: {
      CLOUDFLARE_API_TOKEN: TOKEN,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_ZONE_ID: ZONE_ID,
      CLOUDFLARE_APP_BINDING_EVIDENCE_PATH: evidencePath,
    },
    fetchImpl,
    now: () => new Date('2026-08-21T22:30:00.000Z'),
  });

  assert.equal(receipt.status, 'audited');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.automaticMutationAuthorized, false);
  assert.equal(receipt.providerIdentityVerified, true);
  assert.deepEqual(receipt.pagesDomain, {
    id: 'pages-domain-id',
    name: 'app.sekretbip.net',
    status: 'active',
  });
  assert.deepEqual(receipt.exactWorkerDomains, [{
    id: 'worker-domain-id',
    hostname: 'app.sekretbip.net',
    service: 'sekret-backend',
  }]);
  assert.deepEqual(receipt.exactWorkerRoutes, [{
    id: 'exact-route-id',
    pattern: 'app.sekretbip.net/*',
    script: 'sekret-backend',
  }]);
  assert.deepEqual(receipt.broadWorkerRoutes, [{
    id: 'broad-route-id',
    pattern: '*.sekretbip.net/*',
    script: 'sekret',
  }]);
  assert.deepEqual(receipt.runtime, {
    status: 405,
    contentType: 'application/json; charset=utf-8',
    finalHostname: 'app.sekretbip.net',
    redirected: false,
    classification: 'method-not-allowed',
  });
  assert.deepEqual(receipt.backend, { status: 200, ok: true, worker: 'sekret-backend' });
  assert.ok(calls.every((call) => call.method === 'GET'), 'provider/runtime audit must remain GET-only');

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, new RegExp(TOKEN));
  assert.doesNotMatch(retained, new RegExp(ACCOUNT_ID));
  assert.doesNotMatch(retained, new RegExp(ZONE_ID));
  assert.doesNotMatch(retained, /must-not-be-retained/);
});

test('classifies anonymous frontend and Access shapes without retaining page bodies', () => {
  assert.equal(classifyRuntimeProbe({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    finalUrl: 'https://app.sekretbip.net/',
    body: '<html><title>Se’kret Bip</title></html>',
  }), 'frontend-html');

  assert.equal(classifyRuntimeProbe({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    finalUrl: 'https://tenant.cloudflareaccess.com/cdn-cgi/access/login',
    body: 'Cloudflare Access Sign in',
  }), 'cloudflare-access');
});

test('fails closed and writes sanitized evidence when the binding credential cannot read provider state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-app-binding-failure-'));
  const evidencePath = path.join(dir, 'evidence.json');

  await assert.rejects(
    () => auditCloudflareAppBindingAuthority({
      env: {
        CLOUDFLARE_API_TOKEN: TOKEN,
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_ZONE_ID: ZONE_ID,
        CLOUDFLARE_APP_BINDING_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url, options = {}) => {
        assert.equal(String(options.method || 'GET').toUpperCase(), 'GET');
        assert.ok(url.endsWith(`/zones/${ZONE_ID}`));
        return jsonResponse(null, {
          ok: false,
          status: 403,
          errors: [{ code: 10000, message: 'Authentication error containing secret detail' }],
        });
      },
    }),
    /Cloudflare read failed/,
  );

  const retained = fs.readFileSync(evidencePath, 'utf8');
  const receipt = JSON.parse(retained);
  assert.equal(receipt.status, 'audit-failed');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.automaticMutationAuthorized, false);
  assert.deepEqual(receipt.failure, {
    stage: 'provider-read',
    status: 403,
    providerCodes: [10000],
  });
  assert.doesNotMatch(retained, /Authentication error/);
  assert.doesNotMatch(retained, new RegExp(TOKEN));
  assert.doesNotMatch(retained, new RegExp(ACCOUNT_ID));
  assert.doesNotMatch(retained, new RegExp(ZONE_ID));
});
