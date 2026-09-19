import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildStaticSupabaseIdentityMarker,
  resolveSupabaseTarget,
  verifySupabaseManagementIdentity,
} from '../scripts/supabase-target-identity.mjs';

const registry = JSON.parse(fs.readFileSync('config/supabase-targets.json', 'utf8'));
const canonical = registry.targets['sekret-bip-production'];

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
  };
}

test('canonical production target binds repo, environment, ref, and URL', async () => {
  const target = await resolveSupabaseTarget({
    env: {
      SUPABASE_TARGET: 'sekret-bip-production',
      SUPABASE_PROJECT_REF: canonical.projectRef,
      SUPABASE_URL: canonical.projectUrl,
      GITHUB_REPOSITORY: canonical.repository,
      SUPABASE_ENVIRONMENT: canonical.environment,
    },
  });
  assert.deepEqual(target, {
    name: 'sekret-bip-production',
    ...canonical,
  });
});

test('missing target fails closed instead of guessing a Supabase account', async () => {
  await assert.rejects(
    resolveSupabaseTarget({ env: {} }),
    /SUPABASE_TARGET is required/,
  );
});

test('mismatched ref or URL invalidates the target before provider access', async () => {
  await assert.rejects(
    resolveSupabaseTarget({
      env: {
        SUPABASE_TARGET: 'sekret-bip-production',
        SUPABASE_PROJECT_REF: 'wrongprojectref',
      },
    }),
    /SUPABASE_TARGET_REF_MISMATCH/,
  );
  await assert.rejects(
    resolveSupabaseTarget({
      env: {
        SUPABASE_TARGET: 'sekret-bip-production',
        SUPABASE_URL: 'https://wrongprojectref.supabase.co',
      },
    }),
    /SUPABASE_TARGET_URL_MISMATCH/,
  );
});

test('provider readback must resolve the exact registered project', async () => {
  const target = await resolveSupabaseTarget({
    env: { SUPABASE_TARGET: 'sekret-bip-production' },
  });
  const marker = await verifySupabaseManagementIdentity({
    target,
    accessToken: 'test-token',
    fetchImpl: async (url) => {
      assert.equal(url, `https://api.supabase.com/v1/projects/${canonical.projectRef}`);
      return response(200, {
        id: canonical.projectRef,
        name: "Se'kret Bip",
        organization_id: 'org_test',
      });
    },
  });
  assert.equal(marker.providerVerified, true);
  assert.equal(marker.browserCookie, false);
  assert.equal(marker.authority, false);
  assert.equal(marker.identity.organizationId, 'org_test');
  assert.equal(marker.identity.projectName, "Se'kret Bip");
  assert.match(marker.fingerprint, /^[0-9a-f]{64}$/);
});

test('provider mismatch fails closed and cannot mint a green proof cookie', async () => {
  const target = await resolveSupabaseTarget({
    env: { SUPABASE_TARGET: 'sekret-bip-production' },
  });
  await assert.rejects(
    verifySupabaseManagementIdentity({
      target,
      accessToken: 'test-token',
      fetchImpl: async () => response(200, { id: 'differentprojectref' }),
    }),
    /SUPABASE_TARGET_PROVIDER_REF_MISMATCH/,
  );
});

test('static marker is explicitly non-authorizing and unverified', async () => {
  const target = await resolveSupabaseTarget({
    env: { SUPABASE_TARGET: 'sekret-bip-production' },
  });
  const marker = buildStaticSupabaseIdentityMarker(target);
  assert.equal(marker.providerVerified, false);
  assert.equal(marker.authority, false);
  assert.equal(marker.browserCookie, false);
  assert.equal(marker.identity.organizationId, null);
  assert.equal(marker.identity.projectName, null);
});
