import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  auditCloudflareAccessCoverage,
  formatAccessAuditLogSummary,
} from '../scripts/audit-cloudflare-access-coverage.mjs';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

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

test('formats a compact Access audit log summary without provider identifiers', () => {
  const summary = formatAccessAuditLogSummary({
    status: 'audited',
    mutationPerformed: false,
    targets: ['sekretbip.net', 'app.sekretbip.net', 'api.sekretbip.net'],
    coverage: [
      {
        hostname: 'app.sekretbip.net',
        matchingApplications: [
          {
            id: 'all-workers-app',
            name: 'All Workers',
            domain: 'app.sekretbip.net',
            policies: [{ id: 'policy-all', decision: 'allow' }],
            policyReadError: null,
          },
        ],
      },
      {
        hostname: 'api.sekretbip.net',
        matchingApplications: [
          {
            id: 'backend-worker-app',
            name: 'Se’kret Backend Worker',
            policies: [],
            policyReadError: { status: 403 },
          },
        ],
      },
      { hostname: 'sekretbip.net', matchingApplications: [] },
    ],
    organization: {
      authDomain: 'mcgill-raylene.cloudflareaccess.com',
      denyUnmatchedRequests: true,
    },
  });

  assert.equal(
    summary,
    'CLOUDFLARE_ACCESS_AUDIT status=audited targets=3 matchedTargets=2 matchingApplications=2 policyReadFailures=1 organizationVisible=true mutationPerformed=false',
  );
  assert.doesNotMatch(summary, /all-workers-app|All Workers|policy-all|backend-worker-app/);
  assert.doesNotMatch(summary, /app\.sekretbip\.net|api\.sekretbip\.net/);
  assert.doesNotMatch(summary, /mcgill-raylene\.cloudflareaccess\.com/);
});

test('falls back across token candidates and retains only redacted matching Access coverage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-access-audit-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const staleToken = 'stale-token-must-not-appear';
  const activeToken = 'active-token-must-not-appear';
  const secretEmail = 'private@example.com';
  const authorizationSeen = [];

  const fetchImpl = async (url, options = {}) => {
    const token = String(options.headers?.Authorization || '').replace(/^Bearer /, '');
    authorizationSeen.push(token);

    if (url.endsWith('/access/apps?per_page=1000')) {
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
          id: 'all-workers-app',
          name: 'All Workers',
          type: 'self_hosted',
          destinations: [{ type: 'all_workers' }],
        },
        {
          id: 'backend-worker-app',
          name: 'Se’kret Backend Worker',
          type: 'self_hosted',
          destinations: [{ type: 'worker', worker_id: 'sekret-backend' }],
        },
        {
          id: 'other-worker-app',
          name: 'Other Product Worker',
          type: 'self_hosted',
          destinations: [{ type: 'worker', worker_id: 'unrelated-worker' }],
        },
        {
          id: 'app-host',
          name: 'Se’kret App',
          type: 'self_hosted',
          domain: 'app.sekretbip.net',
          destinations: [{ type: 'public', uri: 'https://app.sekretbip.net' }],
        },
        {
          id: 'unrelated',
          name: 'Unrelated Private App',
          type: 'self_hosted',
          domain: 'private.example.com',
        },
      ]);
    }

    if (url.endsWith('/access/organizations')) {
      if (token === staleToken) {
        return response(null, {
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          errors: [{ code: 10000, message: 'Authentication error' }],
        });
      }
      assert.equal(token, activeToken);
      return response({
        name: 'Sensitive organization name',
        auth_domain: 'mcgill-raylene.cloudflareaccess.com',
        deny_unmatched_requests: true,
        deny_unmatched_requests_exempted_zone_names: ['internal-example.invalid'],
        is_ui_read_only: false,
      });
    }

    if (url.includes('/access/apps/all-workers-app/policies')) {
      return response([
        {
          id: 'policy-all',
          name: 'Require login containing private@example.com',
          decision: 'allow',
          precedence: 1,
          include: [{ email: { email: secretEmail } }],
          require: [],
          exclude: [],
        },
      ]);
    }

    if (url.includes('/access/apps/backend-worker-app/policies')) {
      return response([
        {
          id: 'policy-worker',
          name: 'Private Worker Team',
          decision: 'allow',
          precedence: 2,
          include: [{ group: { id: 'private-group-value' } }],
          require: [],
          exclude: [],
        },
      ]);
    }

    if (url.includes('/access/apps/app-host/policies')) {
      return response([
        {
          id: 'policy-app',
          name: 'Allow team',
          decision: 'allow',
          precedence: 1,
          include: [{ email_domain: { domain: 'example.com' } }],
          require: [],
          exclude: [],
        },
      ]);
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const receipt = await auditCloudflareAccessCoverage({
    env: {
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_ACCESS_API_TOKEN: staleToken,
      CLOUDFLARE_API_TOKEN: activeToken,
      CLOUDFLARE_ACCESS_EVIDENCE_PATH: evidencePath,
      CLOUDFLARE_ACCESS_TARGET_ZONE: 'sekretbip.net',
    },
    fetchImpl,
    now: () => new Date('2026-08-16T08:20:00.000Z'),
  });

  assert.equal(receipt.version, 2);
  assert.equal(receipt.status, 'audited');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.backendWorkerId, 'sekret-backend');
  assert.equal(receipt.credential.selectedSource, 'CLOUDFLARE_API_TOKEN');
  assert.equal(receipt.credential.failures[0].status, 403);
  assert.deepEqual(receipt.credential.failures[0].providerCodes, [10000]);
  assert.equal(receipt.credential.organizationSelectedSource, 'CLOUDFLARE_API_TOKEN');
  assert.equal(receipt.credential.organizationFailures[0].status, 403);
  assert.deepEqual(receipt.credential.organizationFailures[0].providerCodes, [10000]);

  const appCoverage = receipt.coverage.find((item) => item.hostname === 'app.sekretbip.net');
  const apiCoverage = receipt.coverage.find((item) => item.hostname === 'api.sekretbip.net');
  assert.deepEqual(
    appCoverage.matchingApplications.map((app) => app.name).sort(),
    ['All Workers', 'Se’kret App', 'Se’kret Backend Worker'].sort(),
  );
  assert.deepEqual(
    apiCoverage.matchingApplications.map((app) => app.name).sort(),
    ['All Workers', 'Se’kret Backend Worker'].sort(),
  );
  assert.deepEqual(appCoverage.matchingApplications[0].policies[0].includeSelectors, ['email']);

  assert.deepEqual(receipt.organization, {
    authDomain: 'mcgill-raylene.cloudflareaccess.com',
    denyUnmatchedRequests: true,
    targetZone: 'sekretbip.net',
    targetZoneExempted: false,
    exemptedZoneCount: 1,
    isUiReadOnly: false,
  });

  const retained = fs.readFileSync(evidencePath, 'utf8');
  assert.doesNotMatch(retained, new RegExp(staleToken));
  assert.doesNotMatch(retained, new RegExp(activeToken));
  assert.doesNotMatch(retained, new RegExp(secretEmail));
  assert.doesNotMatch(retained, /private-group-value/);
  assert.doesNotMatch(retained, /Require login containing private@example.com/);
  assert.doesNotMatch(retained, /Other Product Worker/);
  assert.doesNotMatch(retained, /Unrelated Private App/);
  assert.doesNotMatch(retained, /internal-example\.invalid/);
  assert.doesNotMatch(retained, /Sensitive organization name/);
  assert.ok(authorizationSeen.includes(staleToken));
  assert.ok(authorizationSeen.includes(activeToken));
});

test('preserves absent Access organization settings as unknown instead of false', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-access-org-unknown-'));
  const evidencePath = path.join(dir, 'evidence.json');

  const receipt = await auditCloudflareAccessCoverage({
    env: {
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: 'active-token',
      CLOUDFLARE_ACCESS_EVIDENCE_PATH: evidencePath,
    },
    fetchImpl: async (url) => {
      if (url.endsWith('/access/apps?per_page=1000')) return response([]);
      if (url.endsWith('/access/organizations')) {
        return response({ auth_domain: 'mcgill-raylene.cloudflareaccess.com' });
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  assert.deepEqual(receipt.organization, {
    authDomain: 'mcgill-raylene.cloudflareaccess.com',
    denyUnmatchedRequests: null,
    targetZone: 'sekretbip.net',
    targetZoneExempted: null,
    exemptedZoneCount: null,
    isUiReadOnly: null,
  });
});

test('writes a fail-closed receipt when Access organization settings cannot be read', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-access-org-fail-'));
  const evidencePath = path.join(dir, 'evidence.json');
  const token = 'read-apps-only-token';

  await assert.rejects(
    () => auditCloudflareAccessCoverage({
      env: {
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ACCESS_EVIDENCE_PATH: evidencePath,
      },
      fetchImpl: async (url) => {
        if (url.endsWith('/access/apps?per_page=1000')) return response([]);
        if (url.endsWith('/access/organizations')) {
          return response(null, {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            errors: [{ code: 10000, message: 'Authentication error' }],
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    }),
    /No configured Cloudflare token could read Access organization settings/,
  );

  const receiptText = fs.readFileSync(evidencePath, 'utf8');
  const receipt = JSON.parse(receiptText);
  assert.equal(receipt.version, 2);
  assert.equal(receipt.status, 'organization-read-failed');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.applicationCountObserved, 0);
  assert.equal(receipt.organization, null);
  assert.deepEqual(receipt.credential.organizationFailures, [
    { source: 'CLOUDFLARE_API_TOKEN', status: 403, providerCodes: [10000] },
  ]);
  assert.doesNotMatch(receiptText, new RegExp(token));
  assert.doesNotMatch(receiptText, /Authentication error/);
});

test('writes a fail-closed receipt when Cloudflare credentials are missing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-access-audit-config-'));
  const evidencePath = path.join(dir, 'evidence.json');

  await assert.rejects(
    () => auditCloudflareAccessCoverage({
      env: { CLOUDFLARE_ACCESS_EVIDENCE_PATH: evidencePath },
      fetchImpl: async () => {
        throw new Error('provider must not be called');
      },
    }),
    /CLOUDFLARE_ACCOUNT_ID is required/,
  );

  const receipt = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(receipt.version, 2);
  assert.equal(receipt.status, 'configuration-missing');
  assert.equal(receipt.mutationPerformed, false);
  assert.equal(receipt.accountIdConfigured, false);
});
