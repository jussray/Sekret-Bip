import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  appHasExactPublicDestination,
  appHasOnlyManagedPublicDestination,
  configFromEnv,
  isCloudflareAccessUrl,
  isEveryoneBypassPolicy,
  listApplications,
  publicDestinationTargetsHost,
  selectBlockingApplication,
} from '../scripts/reconcile-cloudflare-public-apex-access.mjs';

const workflowSource = readFileSync(
  new URL('../.github/workflows/reconcile-cloudflare-public-apex-access.yml', import.meta.url),
  'utf8',
);
const reconcilerSource = readFileSync(
  new URL('../scripts/reconcile-cloudflare-public-apex-access.mjs', import.meta.url),
  'utf8',
);

test('defaults target only the public apex', () => {
  const config = configFromEnv({});
  assert.equal(config.targetHostname, 'sekretbip.net');
  assert.equal(config.targetUrl, 'https://sekretbip.net/');
  assert.equal(config.applicationName, 'sekretbip.net - public apex bypass');
});

test('public destination matching is exact-host scoped', () => {
  assert.equal(
    publicDestinationTargetsHost({ type: 'public', uri: 'sekretbip.net/*' }, 'sekretbip.net'),
    true,
  );
  assert.equal(
    publicDestinationTargetsHost({ type: 'public', uri: 'sekretbip.net/welcome/*' }, 'sekretbip.net'),
    true,
  );
  assert.equal(
    publicDestinationTargetsHost({ type: 'public', uri: 'app.sekretbip.net/*' }, 'sekretbip.net'),
    false,
  );
  assert.equal(
    publicDestinationTargetsHost({ type: 'all_workers' }, 'sekretbip.net'),
    false,
  );
});

test('application public destination check does not treat worker scope as apex ownership', () => {
  assert.equal(
    appHasExactPublicDestination(
      { destinations: [{ type: 'all_workers' }, { type: 'worker', worker_id: 'sekret-backend' }] },
      'sekretbip.net',
    ),
    false,
  );
  assert.equal(
    appHasExactPublicDestination(
      { destinations: [{ type: 'public', uri: 'sekretbip.net/*' }] },
      'sekretbip.net',
    ),
    true,
  );
});

test('application inventory honors authoritative total_pages even when a page is short', async () => {
  const originalFetch = globalThis.fetch;
  const requestedPages = [];
  globalThis.fetch = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    requestedPages.push(page);
    const result = page === 1
      ? [{ id: 'page-1-a' }, { id: 'page-1-b' }]
      : [{ id: 'page-2-app' }];
    return new Response(JSON.stringify({ success: true, result, result_info: { total_pages: 2 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const apps = await listApplications({ token: 'test-token', accountId: 'account' });
    assert.deepEqual(requestedPages, [1, 2]);
    assert.deepEqual(apps.map((app) => app.id), ['page-1-a', 'page-1-b', 'page-2-app']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('managed bypass destination set is exactly apex-only', () => {
  assert.equal(
    appHasOnlyManagedPublicDestination(
      { destinations: [{ type: 'public', uri: 'sekretbip.net/*' }] },
      'sekretbip.net',
    ),
    true,
  );
  assert.equal(
    appHasOnlyManagedPublicDestination(
      {
        destinations: [
          { type: 'public', uri: 'sekretbip.net/*' },
          { type: 'all_workers' },
        ],
      },
      'sekretbip.net',
    ),
    false,
  );
  assert.equal(
    appHasOnlyManagedPublicDestination(
      { destinations: [{ type: 'public', uri: 'sekretbip.net/private/*' }] },
      'sekretbip.net',
    ),
    false,
  );
});

test('Cloudflare Access URLs are detected by host or Access path', () => {
  assert.equal(
    isCloudflareAccessUrl('https://jussray.cloudflareaccess.com/cdn-cgi/access/login/sekretbip.net'),
    true,
  );
  assert.equal(isCloudflareAccessUrl('https://sekretbip.net/cdn-cgi/access/login'), true);
  assert.equal(isCloudflareAccessUrl('https://sekretbip.net/'), false);
});

test('bypass policy must be unconditional Everyone', () => {
  assert.equal(
    isEveryoneBypassPolicy({ decision: 'bypass', include: [{ everyone: {} }] }),
    true,
  );
  assert.equal(
    isEveryoneBypassPolicy({ decision: 'allow', include: [{ everyone: {} }] }),
    false,
  );
  assert.equal(
    isEveryoneBypassPolicy({ decision: 'bypass', include: [{ email: { email: 'owner@example.com' } }] }),
    false,
  );
  assert.equal(
    isEveryoneBypassPolicy({
      decision: 'bypass',
      include: [{ everyone: {} }],
      require: [{ country: { country_code: 'US' } }],
    }),
    false,
  );
  assert.equal(
    isEveryoneBypassPolicy({
      decision: 'bypass',
      include: [{ everyone: {} }],
      exclude: [{ email_domain: { domain: 'example.com' } }],
    }),
    false,
  );
});

test('blocking Access audience must resolve to at most one application', () => {
  const apps = [
    { id: 'a', aud: 'aud-a' },
    { id: 'b', aud: 'aud-b' },
  ];
  assert.equal(selectBlockingApplication(apps, 'aud-b')?.id, 'b');
  assert.equal(selectBlockingApplication(apps, 'missing'), null);
  assert.equal(selectBlockingApplication(apps, ''), null);
  assert.throws(
    () => selectBlockingApplication([{ id: 'a', aud: 'same' }, { id: 'b', aud: 'same' }], 'same'),
    /BLOCKING_AUD_NOT_UNIQUE/,
  );
});

test('provider mutation is founder-gated behind the protected Production environment', () => {
  assert.match(workflowSource, /environment:\s*Production/);
  assert.match(workflowSource, /test "\$GITHUB_ACTOR" = "jussray"/);
  assert.match(workflowSource, /test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(workflowSource, /EXPECTED_MAIN_SHA:\s*\$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(workflowSource, /FIX_SEKRET_BIP_PUBLIC_APEX_ACCESS/);
  assert.match(workflowSource, /test "\$EXPECTED_MAIN_SHA" = "\$GITHUB_SHA"/);
});

test('browser setup finishes before final current-main revalidation and provider mutation', () => {
  assert.match(workflowSource, /Install Chromium for anonymous production proof/);
  assert.match(workflowSource, /Revalidate exact current main immediately before mutation/);
  assert.match(workflowSource, /main moved during job setup/);
  assert.match(workflowSource, /expected_main_sha is stale/);
  const chromiumIndex = workflowSource.indexOf('Install Chromium for anonymous production proof');
  const revalidateIndex = workflowSource.indexOf('Revalidate exact current main immediately before mutation');
  const reconcileIndex = workflowSource.indexOf('Reconcile exact public apex Access exception');
  assert.ok(chromiumIndex >= 0 && revalidateIndex > chromiumIndex && reconcileIndex > revalidateIndex);
});

test('a run-created bypass stays rollback-capable through browser proof and reconcile failure', () => {
  assert.match(
    workflowSource,
    /if: \(failure\(\) \|\| cancelled\(\)\) && steps\.reconcile\.outcome != 'skipped'/,
  );
  assert.match(workflowSource, /--rollback-created/);
  assert.match(reconcilerSource, /ROLLBACK_EVIDENCE_SCOPE_MISMATCH/);
  assert.match(reconcilerSource, /evidence\?\.mutationPerformed !== true/);
  assert.match(reconcilerSource, /evidence\?\.mutationAttribution !== 'provider-returned-id'/);
  assert.match(reconcilerSource, /ROLLBACK_MANAGED_APP_DESTINATION_MISMATCH/);
  assert.match(reconcilerSource, /rolled-back-after-proof-failure/);
});

test('managed and rollback paths reject destination broadening', () => {
  assert.match(reconcilerSource, /MANAGED_PUBLIC_BYPASS_DESTINATION_DRIFT/);
  assert.match(reconcilerSource, /appHasOnlyManagedPublicDestination\(createdApp, config\.targetHostname\)/);
  assert.match(reconcilerSource, /appHasOnlyManagedPublicDestination\(candidate, config\.targetHostname\)/);
});

test('provider/account identifiers are not echoed in clear-text request failures', () => {
  assert.doesNotMatch(reconcilerSource, /Cloudflare \$\{options\.method/);
  assert.doesNotMatch(reconcilerSource, /final_url=/);
  assert.match(reconcilerSource, /Cloudflare provider request failed with status/);
});
