import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRODUCTION_HISTORY_AUTHORITY_FLOOR,
  verifySupabaseProductionSchema,
} from '../scripts/verify-supabase-production-schema.mjs';
import { publishProductionReleaseBlocker } from '../scripts/publish-production-release-observation.mjs';

const SHA = '101abcf129df0a8e9bb2ad3e3b5f1a81e0c16399';
const SCHEMA_HEAD = '20260811134000';

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function migrationFixture(prefix) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const migrationsDir = path.join(tmp, 'migrations');
  const evidencePath = path.join(tmp, 'supabase-production-schema.json');
  fs.mkdirSync(migrationsDir);
  fs.writeFileSync(
    path.join(migrationsDir, `${SCHEMA_HEAD}_fixture.sql`),
    '-- fixture\n',
    'utf8',
  );
  return { tmp, migrationsDir, evidencePath };
}

test('missing Supabase token fails closed and retains redacted schema evidence', async () => {
  const { migrationsDir, evidencePath } = migrationFixture('sekret-schema-config-block-');

  let providerRequests = 0;
  await assert.rejects(
    verifySupabaseProductionSchema({
      config: {
        token: '',
        projectRef: 'tbsevonvegdnlyjgplmm',
        migrationsDir,
        evidencePath,
      },
      fetchImpl: async () => {
        providerRequests += 1;
        throw new Error('provider request should not happen');
      },
    }),
    /SUPABASE_ACCESS_TOKEN is required/,
  );

  assert.equal(providerRequests, 0);
  assert.equal(fs.existsSync(evidencePath), true);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(evidence.verified, false);
  assert.equal(evidence.status, 'configuration-invalid');
  assert.equal(evidence.error, 'missing_supabase_access_token');
  assert.equal(evidence.authorityFloorVersion, PRODUCTION_HISTORY_AUTHORITY_FLOOR);
  assert.equal(evidence.expectedVersion, SCHEMA_HEAD);
  assert.equal(evidence.liveMaxVersion, null);
  assert.deepEqual(evidence.requiredCanonicalVersions, []);
  assert.deepEqual(evidence.representedCanonicalVersions, []);
  assert.deepEqual(evidence.acceptedAliasVersions, []);
  assert.deepEqual(evidence.missingCanonicalVersions, []);
  assert.deepEqual(evidence.unexpectedRecentVersions, []);
  assert.doesNotMatch(evidenceText, /Bearer|secret-token/i);
});

test('response-body transport failure retains provider-query evidence', async () => {
  const { migrationsDir, evidencePath } = migrationFixture('sekret-schema-response-block-');
  const token = 'secret-token-must-not-be-retained';

  await assert.rejects(
    verifySupabaseProductionSchema({
      config: {
        token,
        projectRef: 'tbsevonvegdnlyjgplmm',
        migrationsDir,
        evidencePath,
      },
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async text() {
          throw new Error('stream reset while reading response');
        },
      }),
    }),
    /stream reset while reading response/,
  );

  assert.equal(fs.existsSync(evidencePath), true);
  const evidenceText = fs.readFileSync(evidencePath, 'utf8');
  const evidence = JSON.parse(evidenceText);
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(evidence.verified, false);
  assert.equal(evidence.status, 'provider-query-failed');
  assert.equal(evidence.error, 'management_api_response_read_failed');
  assert.equal(evidence.authorityFloorVersion, PRODUCTION_HISTORY_AUTHORITY_FLOOR);
  assert.equal(evidence.expectedVersion, SCHEMA_HEAD);
  assert.equal(evidence.liveMaxVersion, null);
  assert.doesNotMatch(evidenceText, new RegExp(token));
});

test('blocked release receipt names Supabase preflight failure without inventing Cloudflare identity', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-schema-receipt-'));
  const schemaEvidencePath = path.join(tmp, 'supabase-production-schema.json');
  const missingCloudflarePath = path.join(tmp, 'cloudflare-native-deploy.json');
  fs.writeFileSync(schemaEvidencePath, JSON.stringify({
    schemaVersion: 2,
    verified: false,
    status: 'configuration-invalid',
    projectRef: 'tbsevonvegdnlyjgplmm',
    authorityFloorVersion: PRODUCTION_HISTORY_AUTHORITY_FLOOR,
    expectedVersion: SCHEMA_HEAD,
    liveMaxVersion: null,
    requiredCanonicalVersions: [],
    representedCanonicalVersions: [],
    acceptedAliasVersions: [],
    missingCanonicalVersions: [],
    unexpectedRecentVersions: [],
    error: 'missing_supabase_access_token',
  }), 'utf8');

  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('?per_page=100')) return jsonResponse([]);
    return jsonResponse({ id: 1234 }, 201);
  };

  try {
    await publishProductionReleaseBlocker({
      GITHUB_TOKEN: 'github-test-token',
      GITHUB_REPOSITORY: 'jussray/Sekret-Bip',
      GITHUB_RUN_ID: '31520302714',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_API_URL: 'https://api.github.com',
      EXPECTED_RELEASE_SHA: SHA,
      RELEASE_OBSERVATION_ISSUE: '696',
      VERIFICATION_JOB_STATUS: 'failure',
      RELEASE_STEP_OUTCOMES: JSON.stringify({
        checkout: 'success',
        exact_head: 'success',
        install: 'success',
        supabase_schema: 'failure',
        cloudflare_release: 'skipped',
        production_playwright: 'skipped',
      }),
      CLOUDFLARE_EVIDENCE_PATH: missingCloudflarePath,
      SUPABASE_SCHEMA_EVIDENCE_PATH: schemaEvidencePath,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  const published = JSON.parse(calls[1].options.body).body;
  assert.match(published, /Readiness state: `supabase-configuration-invalid`/);
  assert.match(published, /Evidence SHA: `not observed`/);
  assert.match(published, /Pages marker SHA: `not observed`/);
  assert.match(published, /Pages marker exact: `no`/);
  assert.match(published, /supabase_schema: `failure`/);
  assert.match(published, /cloudflare_release: `skipped`/);
  assert.match(published, /Evidence retained: `yes`/);
  assert.match(published, /Repository migration head: `20260811134000`/);
  assert.match(published, /Live migration head: `not observed`/);
  assert.match(published, /Witness error: `missing_supabase_access_token`/);
  assert.match(published, /Observer error: `none reported`/);
  assert.doesNotMatch(published, /Evidence file was not found at .*cloudflare-native-deploy/);
});
