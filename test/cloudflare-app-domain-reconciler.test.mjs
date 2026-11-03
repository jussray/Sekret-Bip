import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  appProbeIsFrontend,
  backendHealthIdentityMatches,
  classifyWorkerBindings,
  isCloudflareAccessUrl,
  routePatternMayMatchHost,
  routePatternTargetsExactHost,
  validateResolvedZone,
} from '../scripts/reconcile-cloudflare-app-domain.mjs';

const config = {
  hostname: 'app.sekretbip.net',
  workerName: 'sekret-backend',
};

test('exact app hostname Worker routes are selected without widening delete scope', () => {
  assert.equal(routePatternTargetsExactHost('app.sekretbip.net/*', config.hostname), true);
  assert.equal(routePatternTargetsExactHost('https://app.sekretbip.net/*', config.hostname), true);
  assert.equal(routePatternTargetsExactHost('*.sekretbip.net/*', config.hostname), false);
  assert.equal(routePatternMayMatchHost('*.sekretbip.net/*', config.hostname), true);

  const classified = classifyWorkerBindings(
    {
      domains: [
        { id: 'domain-1', hostname: 'app.sekretbip.net', service: 'sekret-backend' },
        { id: 'domain-api', hostname: 'api.sekretbip.net', service: 'sekret-backend' },
      ],
      routes: [
        { id: 'route-1', pattern: 'app.sekretbip.net/*', script: 'sekret-backend' },
        { id: 'route-api', pattern: 'api.sekretbip.net/*', script: 'sekret-backend' },
      ],
    },
    config,
  );

  assert.deepEqual(classified.ownedDomains.map((item) => item.id), ['domain-1']);
  assert.deepEqual(classified.ownedExactRoutes.map((item) => item.id), ['route-1']);
  assert.equal(classified.broadRoutes.length, 0);
});

test('every broad route matching the app hostname is surfaced regardless of Worker owner', () => {
  const classified = classifyWorkerBindings(
    {
      domains: [
        { id: 'foreign-domain', hostname: 'app.sekretbip.net', service: 'legacy-worker' },
      ],
      routes: [
        { id: 'owned-wildcard', pattern: '*.sekretbip.net/*', script: 'sekret-backend' },
        { id: 'foreign-wildcard', pattern: 'app.*/*', script: 'legacy-worker' },
        { id: 'foreign-route', pattern: 'app.sekretbip.net/*', script: 'legacy-worker' },
      ],
    },
    config,
  );

  assert.deepEqual(classified.foreignDomains.map((item) => item.id), ['foreign-domain']);
  assert.deepEqual(classified.foreignExactRoutes.map((item) => item.id), ['foreign-route']);
  assert.deepEqual(
    classified.broadRoutes.map((item) => item.id),
    ['owned-wildcard', 'foreign-wildcard'],
  );
});

test('Cloudflare Access login can never satisfy public frontend readiness', () => {
  assert.equal(
    isCloudflareAccessUrl('https://sekret.cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net'),
    true,
  );
  assert.equal(
    isCloudflareAccessUrl('https://app.sekretbip.net/cdn-cgi/access/login'),
    true,
  );

  assert.equal(
    appProbeIsFrontend({
      url: 'https://app.sekretbip.net',
      requestedUrl: 'https://app.sekretbip.net',
      finalUrl: 'https://sekret.cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net',
      redirected: true,
      status: 200,
      contentType: 'text/html; charset=UTF-8',
      bodyFingerprint: '<title>Cloudflare Access Login</title>',
    }),
    false,
  );

  assert.equal(
    appProbeIsFrontend({
      url: 'https://app.sekretbip.net',
      requestedUrl: 'https://app.sekretbip.net',
      finalUrl: 'https://app.sekretbip.net',
      redirected: false,
      status: 200,
      contentType: 'text/html; charset=UTF-8',
      bodyFingerprint: '<title>Se’kret Bip</title>',
    }),
    true,
  );
});

test('Access-looking HTML fails closed even when redirect metadata is unavailable', () => {
  assert.equal(
    appProbeIsFrontend({
      url: 'https://app.sekretbip.net',
      status: 200,
      contentType: 'text/html',
      bodyFingerprint: '<main>Cloudflare Access sign in</main>',
    }),
    false,
  );
});

test('pinned zone and account IDs must match the resolved Cloudflare zone', () => {
  const resolved = validateResolvedZone(
    {
      zoneName: 'sekretbip.net',
      zoneId: 'zone-1',
      accountId: 'account-1',
    },
    {
      id: 'zone-1',
      name: 'sekretbip.net',
      account: { id: 'account-1' },
    },
  );

  assert.equal(resolved.zoneId, 'zone-1');
  assert.equal(resolved.accountId, 'account-1');

  assert.throws(
    () =>
      validateResolvedZone(
        { zoneName: 'sekretbip.net', zoneId: 'zone-wrong', accountId: 'account-1' },
        { id: 'zone-1', name: 'sekretbip.net', account: { id: 'account-1' } },
      ),
    /ZONE_ID_MISMATCH/,
  );

  assert.throws(
    () =>
      validateResolvedZone(
        { zoneName: 'sekretbip.net', zoneId: 'zone-1', accountId: 'account-wrong' },
        { id: 'zone-1', name: 'sekretbip.net', account: { id: 'account-1' } },
      ),
    /ACCOUNT_ID_MISMATCH/,
  );
});

test('backend health proof requires the canonical Worker identity', () => {
  assert.equal(
    backendHealthIdentityMatches({ ok: true, worker: 'sekret-backend' }, 'sekret-backend'),
    true,
  );
  assert.equal(
    backendHealthIdentityMatches({ ok: true, worker: 'other-worker' }, 'sekret-backend'),
    false,
  );
  assert.equal(
    backendHealthIdentityMatches({ ok: false, worker: 'sekret-backend' }, 'sekret-backend'),
    false,
  );
  assert.equal(backendHealthIdentityMatches(null, 'sekret-backend'), false);
});

test('production reconciler binds mutation to bounded authority, exact current main, and an immediate pre-apply recheck', () => {
  const workflow = fs.readFileSync(
    new URL('../.github/workflows/reconcile-cloudflare-app-domain.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:\s*\n\s+inputs:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /ref: \$\{\{ inputs\.target_sha \|\| github\.sha \}\}/);
  assert.match(workflow, /Verify focused route reconciler contract/);
  assert.match(workflow, /node --test test\/cloudflare-app-domain-reconciler\.test\.mjs/);
  assert.match(workflow, /Resolve bounded apply authority/);
  assert.match(workflow, /\$GITHUB_EVENT_NAME" == 'workflow_dispatch'/);
  assert.match(workflow, /\$GITHUB_EVENT_NAME" == 'push'/);
  assert.match(workflow, /BIP_APP_RECONCILE_APPROVAL_FILE/);
  assert.match(workflow, /git diff-tree --no-commit-id --name-only -r HEAD/);
  assert.match(workflow, /approvedParentSha/);
  assert.match(workflow, /One-shot provider approval is stale or replayed/);
  assert.doesNotMatch(workflow, /github\.event_name == 'push' \|\| inputs\.apply == true/);
  assert.doesNotMatch(workflow, /github\.event_name == 'pull_request' \|\| inputs\.apply == true/);
  assert.match(workflow, /TARGET_SHA: \$\{\{ steps\.apply_authority\.outputs\.approved_target \}\}/);
  assert.match(workflow, /test "\$actual" = "\$TARGET_SHA"/);
  assert.match(workflow, /test "\$TARGET_SHA" = "\$current_main"/);
  assert.match(workflow, /Re-verify exact approved main immediately before provider mutation/);
  assert.match(workflow, /Main advanced after provider preflight; refusing stale Cloudflare mutation authority/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /run-cloudflare-app-domain-reconcile-with-receipt\.mjs\s+--apply/);
  assert.match(workflow, /cloudflare-app-domain-routing-evidence/);
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.doesNotMatch(workflow, /(?:actions\/checkout|actions\/setup-node|actions\/upload-artifact)@v\d+/);
});

test('confirmed provider mutations are persisted before post-apply verification can fail', () => {
  const reconciler = fs.readFileSync(
    new URL('../scripts/reconcile-cloudflare-app-domain.mjs', import.meta.url),
    'utf8',
  );

  assert.match(reconciler, /persistMutationProgress\(context, actions\)/);
  assert.match(reconciler, /persistMutationProgress\(context, actions, 'apply-failed'\)/);
  assert.match(reconciler, /phase = 'apply-in-progress'/);
  assert.match(reconciler, /actions:\s*\[\.\.\.actions\]/);
});

test('top-level failure logging never echoes caught exception text', () => {
  const reconciler = fs.readFileSync(
    new URL('../scripts/reconcile-cloudflare-app-domain.mjs', import.meta.url),
    'utf8',
  );

  assert.match(reconciler, /console\.error\('CLOUDFLARE_APP_DOMAIN_RECONCILIATION_FAILED'\)/);
  assert.doesNotMatch(reconciler, /console\.error\([^\n]*(?:error\.message|String\(error\)|\berror\b)/);
});
