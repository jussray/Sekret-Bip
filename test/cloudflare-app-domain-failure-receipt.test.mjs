import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { classifyObservedRequest } from '../scripts/run-cloudflare-app-domain-reconcile-with-receipt.mjs';

test('sanitized request classification identifies only the provider operations needed by exact-host reconciliation', () => {
  assert.deepEqual(
    classifyObservedRequest(
      'https://api.cloudflare.com/client/v4/accounts/account-1/pages/projects/sekret-bip/domains',
    ),
    { provider: 'cloudflare', operation: 'pages-domains-read', method: 'GET' },
  );
  assert.deepEqual(
    classifyObservedRequest(
      'https://api.cloudflare.com/client/v4/accounts/account-1/workers/domains?hostname=app.sekretbip.net',
    ),
    { provider: 'cloudflare', operation: 'worker-domains-read', method: 'GET' },
  );
  assert.deepEqual(
    classifyObservedRequest(
      'https://api.cloudflare.com/client/v4/zones/zone-1/workers/routes',
    ),
    { provider: 'cloudflare', operation: 'worker-routes-read', method: 'GET' },
  );
  assert.deepEqual(
    classifyObservedRequest('https://app.sekretbip.net/'),
    { provider: 'runtime', operation: 'app-runtime-probe', method: 'GET' },
  );
  assert.deepEqual(
    classifyObservedRequest('https://api.sekretbip.net/health'),
    { provider: 'runtime', operation: 'backend-health-probe', method: 'GET' },
  );
});

test('wrapper delegates authority to the reconciler exact-host binding proof and never requests global Worker inventory', () => {
  const wrapper = fs.readFileSync(
    new URL('../scripts/run-cloudflare-app-domain-reconcile-with-receipt.mjs', import.meta.url),
    'utf8',
  );
  const reconciler = fs.readFileSync(
    new URL('../scripts/reconcile-cloudflare-app-domain.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(wrapper, /\/workers\/scripts/);
  assert.doesNotMatch(wrapper, /TWO_WORKER_TOPOLOGY_PROVIDER_READBACK/);
  assert.match(wrapper, /exact-host-binding-provider-readback-verified/);
  assert.match(wrapper, /sekret-backend-alpha/);

  assert.match(reconciler, /FOREIGN_APP_DOMAIN_BINDING/);
  assert.match(reconciler, /BROAD_WORKER_ROUTE_REQUIRES_MANUAL_REVIEW/);
  assert.match(reconciler, /target domain must already be active on canonical Pages project/);
  assert.match(reconciler, /exact-host Worker domain\/route only/);
});

test('failure wrapper persists a safe receipt and never serializes caught exception text', () => {
  const wrapper = fs.readFileSync(
    new URL('../scripts/run-cloudflare-app-domain-reconcile-with-receipt.mjs', import.meta.url),
    'utf8',
  );

  assert.match(wrapper, /preflight-failed-before-mutation/);
  assert.match(wrapper, /mutationState/);
  assert.match(wrapper, /providerCodes/);
  assert.match(wrapper, /FAILURE_EVIDENCE_WRITTEN/);
  assert.match(wrapper, /exact-host-binding-provider-readback-required/);
  assert.match(wrapper, /protectedWorkers: PROTECTED_WORKERS/);
  assert.doesNotMatch(wrapper, /error\.message|String\(error\)|payload\?\.errors[^\n]*message/);
});

test('workflow retains a sanitized receipt on invalid token transport and keeps strict normalization for valid apply', () => {
  const workflow = fs.readFileSync(
    new URL('../.github/workflows/reconcile-cloudflare-app-domain.yml', import.meta.url),
    'utf8',
  );

  assert.match(
    workflow,
    /node scripts\/run-with-normalized-cloudflare-token\.mjs\s+\\\s+scripts\/run-cloudflare-app-domain-reconcile-with-receipt\.mjs\s+\\\s+--apply/s,
  );
  assert.match(workflow, /normalizeCloudflareTokenTransport/);
  assert.match(workflow, /CLOUDFLARE_APP_DOMAIN_TOKEN_TRANSPORT_INVALID_RETAINING_RECEIPT/);
  assert.match(
    workflow,
    /CLOUDFLARE_API_TOKEN=''\s+\\\s+node scripts\/run-cloudflare-app-domain-reconcile-with-receipt\.mjs --apply/s,
  );
  assert.match(workflow, /cloudflare-app-domain-failure-receipt\.test\.mjs/);
  assert.match(workflow, /if-no-files-found: error/);
});
