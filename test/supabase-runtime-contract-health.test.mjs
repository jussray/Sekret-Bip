import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  RUNTIME_SCHEMA_WITNESS,
  evaluateRuntimeContractHealth,
  verifySupabaseRuntimeContractHealth,
} from '../scripts/verify-supabase-runtime-contract-health.mjs';

function healthyPayload(overrides = {}) {
  return {
    healthy: true,
    contracts: [{
      contractKey: 'consent_deletion_runtime_truth',
      expectedVersion: '20260715060000',
      actualVersion: '20260715060000',
      appliedAt: '2026-07-15T10:08:24.912161+00:00',
    }],
    missing: [],
    schemaWitness: {
      contractVersion: RUNTIME_SCHEMA_WITNESS.contractVersion,
      authorityFloorVersion: RUNTIME_SCHEMA_WITNESS.authorityFloorVersion,
      expectedHistorySha256: RUNTIME_SCHEMA_WITNESS.expectedHistorySha256,
      historySha256: RUNTIME_SCHEMA_WITNESS.expectedHistorySha256,
      expectedLiveMaxVersion: RUNTIME_SCHEMA_WITNESS.expectedLiveMaxVersion,
      liveMaxVersion: RUNTIME_SCHEMA_WITNESS.expectedLiveMaxVersion,
      expectedHistoryCount: RUNTIME_SCHEMA_WITNESS.expectedHistoryCount,
      historyCount: RUNTIME_SCHEMA_WITNESS.expectedHistoryCount,
      expectedPgjwtInstalled: true,
      pgjwtInstalled: true,
      expectedPgjwtVersion: '0.2.0',
      pgjwtVersion: '0.2.0',
      verified: true,
    },
    ...overrides,
  };
}

test('runtime schema witness accepts only the exact bounded fingerprint', () => {
  const evaluated = evaluateRuntimeContractHealth(healthyPayload());
  assert.equal(evaluated.verified, true);
  assert.equal(Object.values(evaluated.checks).every(Boolean), true);
});

test('runtime schema witness fails closed when production migration history drifts', () => {
  const payload = healthyPayload();
  payload.schemaWitness.historySha256 = '0'.repeat(64);
  payload.schemaWitness.verified = false;
  payload.healthy = false;

  const evaluated = evaluateRuntimeContractHealth(payload);
  assert.equal(evaluated.verified, false);
  assert.equal(evaluated.checks.historySha256, false);
  assert.equal(evaluated.checks.schemaVerified, false);
});

test('runtime verifier writes inspectable evidence and rejects stale Edge Function contract', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-runtime-schema-witness-'));
  const evidencePath = path.join(root, 'witness.json');
  const payload = healthyPayload();
  payload.schemaWitness.contractVersion = 'stale';
  payload.healthy = false;

  await assert.rejects(
    verifySupabaseRuntimeContractHealth({
      url: 'https://example.invalid/runtime-contract-health',
      evidencePath,
      fetchImpl: async () => new Response(JSON.stringify(payload), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    }),
    /SUPABASE_RUNTIME_SCHEMA_WITNESS_DRIFT/,
  );

  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(evidence.verified, false);
  assert.equal(evidence.status, 'drift');
  assert.equal(evidence.checks.contractVersion, false);
});
