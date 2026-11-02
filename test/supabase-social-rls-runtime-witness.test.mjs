import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  SOCIAL_GUARD_EXPECTED_TABLES,
  buildReadOnlyQuery,
  evaluateSocialGuardPolicies,
  verifySupabaseProductionSchema,
} from '../scripts/verify-supabase-production-schema.mjs';

const FIXTURE_VERSION = '20261006040000';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bip-rls-readback-'));
  const migrationsDir = path.join(root, 'migrations');
  fs.mkdirSync(migrationsDir);
  fs.writeFileSync(
    path.join(migrationsDir, `${FIXTURE_VERSION}_social_surfaces_permanent_accounts_only.sql`),
    '-- synthetic migration identity only\n',
  );
  return {
    config: {
      projectRef: 'tbsevonvegdnlyjgplmm',
      token: 'synthetic-test-token',
      migrationsDir,
      evidencePath: path.join(root, 'proof.json'),
    },
  };
}

function providerReply(count) {
  return new Response(JSON.stringify([{
    live_max_version: FIXTURE_VERSION,
    migration_history: [{
      version: FIXTURE_VERSION,
      name: 'social_surfaces_permanent_accounts_only',
    }],
    pgjwt_installed: true,
    pgjwt_version: '0.2.0',
    social_guard_policy_count: count,
  }]), { status: 200 });
}

test('production witness reads exactly the intended 14 RLS policies without user rows or writes', () => {
  const query = buildReadOnlyQuery();
  assert.equal(SOCIAL_GUARD_EXPECTED_TABLES.length, 14);
  for (const table of SOCIAL_GUARD_EXPECTED_TABLES) {
    assert.ok(query.includes(`'${table}'`), `missing ${table}`);
  }
  assert.match(query, /from pg_policies p/);
  assert.match(query, /p\.permissive = 'RESTRICTIVE'/);
  assert.match(query, /p\.cmd = 'ALL'/);
  assert.match(query, /tbl\.relrowsecurity/);
  assert.match(query, /p\.qual like '%is_anonymous%'/);
  assert.match(query, /p\.with_check like '%is_anonymous%'/);
  assert.match(query, /p\.qual like '%IS FALSE%'/);
  assert.match(query, /p\.with_check like '%IS FALSE%'/);
  assert.doesNotMatch(query, /p\.(?:qual|with_check) like '%false%'/, 'a COALESCE fallback alone does not prove anonymous denial');
  assert.match(query, /from supabase_migrations\.schema_migrations/);
  assert.doesNotMatch(query, /\b(insert|update|delete|alter|drop|create|grant|revoke)\b/i);
});

test('social policy readback accepts only full coverage', () => {
  assert.equal(evaluateSocialGuardPolicies({ social_guard_policy_count: 14 }).verified, true);
  assert.equal(evaluateSocialGuardPolicies({ social_guard_policy_count: 13 }).verified, false);
  assert.equal(evaluateSocialGuardPolicies({ social_guard_policy_count: 0 }).verified, false);
  assert.equal(evaluateSocialGuardPolicies({ social_guard_policy_count: 'broken' }).verified, false);
  assert.equal(evaluateSocialGuardPolicies({}).verified, false);
  assert.equal(evaluateSocialGuardPolicies({}, { allowInjectedFallback: true }).verified, true);
});

test('release verifier blocks missing effective guards even when migration receipts are complete', async () => {
  const { config } = fixture();
  await assert.rejects(
    verifySupabaseProductionSchema({
      config,
      requireSocialGuardState: true,
      fetchImpl: async () => providerReply(13),
    }),
    /SUPABASE_SOCIAL_RLS_GUARD_DRIFT/,
  );
  const evidence = JSON.parse(fs.readFileSync(config.evidencePath, 'utf8'));
  assert.equal(evidence.status, 'authorization-drift');
  assert.equal(evidence.verified, false);
  assert.equal(evidence.socialGuardObserved, true);
  assert.equal(evidence.socialGuardCount, 13);
  assert.equal(evidence.socialGuardExpected, 14);
  assert.doesNotMatch(JSON.stringify(evidence), /synthetic-test-token/);
});

test('complete production policy readback may pass with the exact canonical receipt', async () => {
  const { config } = fixture();
  const evidence = await verifySupabaseProductionSchema({
    config,
    requireSocialGuardState: true,
    fetchImpl: async () => providerReply(14),
  });
  assert.equal(evidence.verified, true);
  assert.equal(evidence.socialGuardCount, 14);
  assert.equal(evidence.status, 'verified');
});
