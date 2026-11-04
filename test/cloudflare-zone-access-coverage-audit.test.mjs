import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { auditCloudflareZoneAccessCoverage } from '../scripts/audit-cloudflare-zone-access-coverage.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const ZONE_ID = 'fedcba9876543210fedcba9876543210';

function response(result, { ok = true, status = 200, statusText = 'OK', errors = [] } = {}) {
  return {
    ok,
    status,
    statusText,
    async json() {
      return ok
        ? { success: true, result }
        : { success: false, errors };
    },
  };
}

test('uses the configured Se’kret zone ID without rediscovery and retains only matching Access coverage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-zone-access-audit-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const staleToken = 'stale-token-must-not-appear';
  const activeToken = 'active-token-must-not-appear';
  const privateEmail = 'private@example.com';
  let zoneDiscoveryCalls = 0;

  const fetchImpl = async (url, options = {}) => {
    const token = String(options.headers?.Authorization || '').replace(/^Bearer /, '');

    if (url.includes('/zones?')) {
      zoneDiscoveryCalls += 1;
      throw new Error('Configured zone ID must bypass zone discovery.');
    }

    if (url.endsWith(`/zones/${ZONE_ID}/access/apps?per_page=1000`)) {
      if (token === staleToken) {
        return response(null, {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          errors: [{ code: 10000, message: 'Authentication error' }],
        });
      }
      assert.equal(token, activeToken);
      return response([
        {
          id: 'wildcard-app',
          name: 'Legacy Se’kret Access',
          type: 'self_hosted',
          domain: '*.sekretbip.net',
        },
        {
          id: 'app-exact',
          name: 'Se’kret App Exact',
          type: 'self_hosted',
          domain: 'app.sekretbip.net',
        },
        {
          id: 'unrelated-private',
          name: 'Private Admin',
          type: 'self_hosted',
          domain: 'private.sekretbip.net',
        },
      ]);
    }

    if (url.includes(`/zones/${ZONE_ID}/access/apps/wildcard-app/policies`)) {
      return response([
        {
          id: 'policy-wildcard',
          name: `Login for ${privateEmail}`,
          decision: 'allow',
          precedence: 1,
          include: [{ email: { email: privateEmail } }],
          require: [],
          exclude: [],
        },
      ]);
    }

    if (url.includes(`/zones/${ZONE_ID}/access/apps/app-exact/policies`)) {
      return response([
        {
          id: 'policy-app',
          name: 'App Team',
          decision: 'allow',
          precedence: 2,
          include: [{ email_domain: { domain: 'example.com' } }],
          require: [],
          exclude: [],
        },
      ]);
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const receipt = await auditCloudflareZoneAccessCoverage({
    env: {
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_ZONE_ID: ZONE_ID,
      CLOUDFLARE_ACCESS_API_TOKEN: staleToken,
      CLOUDFLARE_API_TOKEN: activeToken,
      CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH: evidencePath,
    },
    fetchImpl,
    now: () => new Date('2026-08-16T08:45:00.000Z'),
  });

  assert.equal(zoneDiscoveryCalls, 0);
  assert.equal(receipt.version, 2);
  assert.equal(receipt.status, 'audited');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.zoneIdConfigured, true);
  assert.equal(receipt.zoneIdSource, 'configured-secret');
  assert.equal(receipt.zoneIdentityVerified, null);
  assert.equal(receipt.applicationCountObserved, 3);
  assert.equal(receipt.credential.selectedSource, 'CLOUDFLARE_API_TOKEN');
  assert.deepEqual(receipt.credential.failures[0], {
    source: 'CLOUDFLARE_ACCESS_API_TOKEN',
    stage: 'zone-access-apps',
    status: 403,
    providerCodes: [10000],
  });

  const appCoverage = receipt.coverage.find((item) => item.hostname === 'app.sekretbip.net');
  const apiCoverage = receipt.coverage.find((item) => item.hostname === 'api.sekretbip.net');
  assert.deepEqual(
    appCoverage.matchingApplications.map((app) => app.name).sort(),
    ['Legacy Se’kret Access', 'Se’kret App Exact'].sort(),
  );
  assert.deepEqual(apiCoverage.matchingApplications.map((app) => app.name), ['Legacy Se’kret Access']);
  assert.deepEqual(
    appCoverage.matchingApplications.find((app) => app.id === 'wildcard-app').policies[0].includeSelectors,
    ['email'],
  );

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, new RegExp(staleToken));
  assert.doesNotMatch(retained, new RegExp(activeToken));
  assert.doesNotMatch(retained, new RegExp(privateEmail));
  assert.doesNotMatch(retained, /example\.com/);
  assert.doesNotMatch(retained, /Private Admin/);
  assert.doesNotMatch(retained, new RegExp(ZONE_ID));
  assert.doesNotMatch(retained, /Login for private@example\.com/);
});

test('falls back to provider discovery when no configured zone ID exists and validates account identity', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-zone-access-discovery-'));
  const evidencePath = path.join(dir, 'evidence.json');

  const receipt = await auditCloudflareZoneAccessCoverage({
    env: {
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: 'configured-token',
      CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH: evidencePath,
    },
    fetchImpl: async (url) => {
      if (url.includes('/zones?name=sekretbip.net')) {
        return response([{ id: ZONE_ID, name: 'sekretbip.net', account: { id: ACCOUNT_ID } }]);
      }
      if (url.endsWith(`/zones/${ZONE_ID}/access/apps?per_page=1000`)) return response([]);
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  assert.equal(receipt.status, 'audited');
  assert.equal(receipt.zoneIdConfigured, false);
  assert.equal(receipt.zoneIdSource, 'provider-discovery');
  assert.equal(receipt.zoneIdentityVerified, true);
  assert.equal(receipt.applicationCountObserved, 0);
});

test('labels a configured-zone failure at the zone Access application read boundary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-zone-access-stage-'));
  const evidencePath = path.join(dir, 'evidence.json');

  await assert.rejects(
    () => auditCloudflareZoneAccessCoverage({
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_ZONE_ID: ZONE_ID,
        CLOUDFLARE_API_TOKEN: 'configured-token',
        CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        assert.ok(url.endsWith(`/zones/${ZONE_ID}/access/apps?per_page=1000`));
        return response(null, {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          errors: [{ code: 10000, message: 'Authentication error' }],
        });
      },
    }),
    /configured Se’kret zone ID/,
  );

  const receiptText = fs.readFileSync(evidencePath, 'utf8');
  const receipt = JSON.parse(receiptText);
  assert.equal(receipt.status, 'zone-access-read-failed');
  assert.equal(receipt.zoneIdConfigured, true);
  assert.deepEqual(receipt.credential.failures, [
    {
      source: 'CLOUDFLARE_API_TOKEN',
      stage: 'zone-access-apps',
      status: 403,
      providerCodes: [10000],
    },
  ]);
  assert.doesNotMatch(receiptText, new RegExp(ZONE_ID));
});

test('fails closed when a discovered zone belongs to another account', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-zone-access-account-mismatch-'));
  const evidencePath = path.join(dir, 'evidence.json');
  let accessAppCalls = 0;

  await assert.rejects(
    () => auditCloudflareZoneAccessCoverage({
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: 'configured-token',
        CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        if (url.includes('/zones?name=sekretbip.net')) {
          return response([{ id: ZONE_ID, name: 'sekretbip.net', account: { id: 'different-account' } }]);
        }
        accessAppCalls += 1;
        throw new Error(`Unexpected request: ${url}`);
      },
    }),
    /resolve the target zone and list its Access applications/,
  );

  assert.equal(accessAppCalls, 0);
  const receipt = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(receipt.status, 'zone-access-read-failed');
  assert.equal(receipt.zoneIdConfigured, false);
  assert.deepEqual(receipt.credential.failures[0].stage, 'zone-discovery');
});

test('writes a fail-closed receipt when Cloudflare credentials are missing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-zone-access-config-'));
  const evidencePath = path.join(dir, 'evidence.json');

  await assert.rejects(
    () => auditCloudflareZoneAccessCoverage({
      env: { CLOUDFLARE_ZONE_ACCESS_EVIDENCE_PATH: evidencePath },
      fetchImpl: async () => {
        throw new Error('provider must not be called');
      },
    }),
    /CLOUDFLARE_ACCOUNT_ID is required/,
  );

  const receipt = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(receipt.status, 'configuration-missing');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.accountIdConfigured, false);
});
