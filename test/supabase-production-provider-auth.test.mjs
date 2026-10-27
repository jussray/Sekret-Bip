import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  classifyManagementApiHttpFailure,
  verifySupabaseProductionSchema,
} from '../scripts/verify-supabase-production-schema.mjs';

const SCHEMA_HEAD = '20260905213434';
const PROJECT_REF = 'tbsevonvegdnlyjgplmm';

function fixture(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const migrationsDir = path.join(root, 'migrations');
  const evidencePath = path.join(root, 'supabase-production-schema.json');
  fs.mkdirSync(migrationsDir);
  fs.writeFileSync(
    path.join(migrationsDir, `${SCHEMA_HEAD}_fixture.sql`),
    '-- fixture\n',
    'utf8',
  );
  return { migrationsDir, evidencePath };
}

function providerResponse(status) {
  return {
    ok: false,
    status,
    async text() {
      return JSON.stringify({ message: 'provider rejected request' });
    },
  };
}

test('Management API auth failures are classified separately from schema drift', () => {
  assert.deepEqual(classifyManagementApiHttpFailure(401), {
    status: 'provider-auth-failed',
    errorCode: 'supabase_access_token_rejected',
    message: 'Supabase Management API rejected SUPABASE_ACCESS_TOKEN with HTTP 401; production schema drift was not evaluated.',
  });
  assert.deepEqual(classifyManagementApiHttpFailure(403), {
    status: 'provider-auth-failed',
    errorCode: 'supabase_access_token_forbidden',
    message: 'Supabase Management API denied SUPABASE_ACCESS_TOKEN with HTTP 403; production schema drift was not evaluated.',
  });
  assert.deepEqual(classifyManagementApiHttpFailure(500), {
    status: 'provider-query-failed',
    errorCode: 'management_api_http_500',
    message: 'Supabase read-only production schema verification failed with HTTP 500.',
  });
});

for (const scenario of [
  { status: 401, error: 'supabase_access_token_rejected' },
  { status: 403, error: 'supabase_access_token_forbidden' },
]) {
  test(`HTTP ${scenario.status} fails closed as provider auth without claiming schema drift`, async () => {
    const { migrationsDir, evidencePath } = fixture(`sekret-provider-auth-${scenario.status}-`);
    const token = `secret-token-${scenario.status}-must-not-be-retained`;

    await assert.rejects(
      verifySupabaseProductionSchema({
        config: {
          token,
          projectRef: PROJECT_REF,
          migrationsDir,
          evidencePath,
        },
        fetchImpl: async () => providerResponse(scenario.status),
      }),
      /production schema drift was not evaluated/,
    );

    const evidenceText = fs.readFileSync(evidencePath, 'utf8');
    const evidence = JSON.parse(evidenceText);
    assert.equal(evidence.verified, false);
    assert.equal(evidence.status, 'provider-auth-failed');
    assert.equal(evidence.error, scenario.error);
    assert.equal(evidence.providerHttpStatus, scenario.status);
    assert.equal(evidence.schemaComparisonPerformed, false);
    assert.equal(evidence.liveMaxVersion, null);
    assert.deepEqual(evidence.missingCanonicalVersions, []);
    assert.deepEqual(evidence.unexpectedRecentVersions, []);
    assert.doesNotMatch(evidenceText, new RegExp(token));
    assert.doesNotMatch(evidenceText, /schema-drift/);
  });
}

test('HTTP 401 is classified before attempting to read a hostile response body', async () => {
  const { migrationsDir, evidencePath } = fixture('sekret-provider-auth-hostile-body-');
  let bodyReads = 0;

  await assert.rejects(
    verifySupabaseProductionSchema({
      config: {
        token: 'secret-token-hostile-body',
        projectRef: PROJECT_REF,
        migrationsDir,
        evidencePath,
      },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        async text() {
          bodyReads += 1;
          throw new Error('auth response body should not be read');
        },
      }),
    }),
    /SUPABASE_ACCESS_TOKEN with HTTP 401/,
  );

  assert.equal(bodyReads, 0);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.status, 'provider-auth-failed');
  assert.equal(evidence.error, 'supabase_access_token_rejected');
  assert.equal(evidence.providerHttpStatus, 401);
  assert.equal(evidence.schemaComparisonPerformed, false);
});
