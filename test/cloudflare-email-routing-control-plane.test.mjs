import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  EMAIL_ALIASES,
  buildWorkerRule,
  configFromEnv,
  findDuplicateSupportedRules,
} from '../scripts/reconcile-cloudflare-email-routing.mjs';

const REQUIRED_ALIASES = [
  'hello',
  'founder',
  'partnerships',
  'support',
  'parents',
  'safety',
  'privacy',
  'legal',
  'security',
];

test('Cloudflare email control plane preserves the canonical alias set', () => {
  assert.deepEqual(EMAIL_ALIASES, REQUIRED_ALIASES);

  const router = fs.readFileSync(new URL('../worker/email-router.ts', import.meta.url), 'utf8');
  for (const alias of REQUIRED_ALIASES) {
    assert.match(router, new RegExp(`\\b${alias}:`));
  }
});

test('Cloudflare email rules target the canonical production Worker', () => {
  const config = configFromEnv({});
  const rule = buildWorkerRule('founder', config);

  assert.equal(config.zoneName, 'sekretbip.net');
  assert.equal(config.workerName, 'sekret-backend');
  assert.equal(config.destinationEmail, 'sekretbip@gmail.com');
  assert.deepEqual(rule.matchers, [
    { type: 'literal', field: 'to', value: 'founder@sekretbip.net' },
  ]);
  assert.deepEqual(rule.actions, [{ type: 'worker', value: ['sekret-backend'] }]);
  assert.equal(rule.enabled, true);
});

test('duplicate supported aliases are detected before reconciliation', () => {
  const config = configFromEnv({});
  const rules = [
    { id: 'one', matchers: [{ type: 'literal', field: 'to', value: 'founder@sekretbip.net' }] },
    { id: 'two', matchers: [{ type: 'literal', field: 'to', value: 'founder@sekretbip.net' }] },
    { id: 'other', matchers: [{ type: 'literal', field: 'to', value: 'random@sekretbip.net' }] },
  ];

  assert.deepEqual(findDuplicateSupportedRules(rules, config), [
    { address: 'founder@sekretbip.net', ids: ['one', 'two'] },
  ]);
});

test('email routing workflow is manual, secrets-backed, token-type-aware, and retains apply evidence', () => {
  const workflow = fs.readFileSync(
    new URL('../.github/workflows/cloudflare-email-routing.yml', import.meta.url),
    'utf8',
  );
  const reconciler = fs.readFileSync(
    new URL('../scripts/reconcile-cloudflare-email-routing.mjs', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /secrets\.CLOUDFLARE_ZONE_ID/);
  assert.match(workflow, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /vars\.CLOUDFLARE_ZONE_ID/);
  assert.doesNotMatch(workflow, /vars\.CLOUDFLARE_ACCOUNT_ID/);
  assert.doesNotMatch(workflow, /test -n "\$CLOUDFLARE_ZONE_ID"/);
  assert.doesNotMatch(workflow, /test -n "\$CLOUDFLARE_ACCOUNT_ID"/);
  assert.doesNotMatch(workflow, /\/user\/tokens\/verify/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days:\s*30/);

  assert.match(reconciler, /\/user\/tokens\/verify/);
  assert.match(reconciler, /\/accounts\/\$\{config\.accountId\}\/tokens\/verify/);
  assert.match(reconciler, /const verifier = path\.startsWith\('\/accounts\/'\) \? 'account' : 'user';/);
  assert.match(reconciler, /CLOUDFLARE_API_TOKEN_ACTIVE verifier=\$\{verifier\}/);
  assert.match(reconciler, /CLOUDFLARE_API_TOKEN_ACTIVE verifier=zone-access/);
  assert.match(reconciler, /CLOUDFLARE_API_TOKEN_INVALID_OR_UNSCOPED/);
  assert.match(reconciler, /\/zones\/\$\{config\.zoneId\}/);
  const verifyIndex = reconciler.indexOf('await verifyToken(config);');
  const discoverIndex = reconciler.indexOf('await discoverZone(config);');
  assert.ok(verifyIndex >= 0 && discoverIndex >= 0 && verifyIndex < discoverIndex);

  assert.match(reconciler, /\/email\/routing\/dns/);
  assert.match(reconciler, /\/email\/routing\/rules\/catch_all/);
  assert.match(reconciler, /DUPLICATE_SUPPORTED_ROUTES/);
  assert.match(reconciler, /CATCH_ALL_ENABLED/);
  assert.match(reconciler, /cloudflare-email-routing-evidence\.json/);
  assert.match(reconciler, /catchAllDesired:\s*'disabled'/);
  assert.doesNotMatch(reconciler, /method:\s*['"]DELETE['"]/);
});
