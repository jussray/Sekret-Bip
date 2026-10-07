import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RUNTIME_SCHEMA_WITNESS = Object.freeze({
  contractVersion: '20260927185000',
  authorityFloorVersion: '20260805170500',
  expectedHistorySha256: '0b5397c36f3120d5180d9501ed73ae01b8663dbb6510a706fa3877b59aa205df',
  expectedLiveMaxVersion: '20261006031559',
  expectedHistoryCount: 34,
  expectedPgjwtInstalled: true,
  expectedPgjwtVersion: '0.2.0',
});

const DEFAULT_URL = 'https://tbsevonvegdnlyjgplmm.supabase.co/functions/v1/runtime-contract-health';
const DEFAULT_EVIDENCE_PATH = 'artifacts/supabase-runtime-contract-health.json';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function writeEvidence(filePath, evidence) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

export function evaluateRuntimeContractHealth(payload) {
  const witness = payload?.schemaWitness ?? {};
  const checks = {
    healthy: payload?.healthy === true,
    contractVersion: witness.contractVersion === RUNTIME_SCHEMA_WITNESS.contractVersion,
    authorityFloorVersion: witness.authorityFloorVersion === RUNTIME_SCHEMA_WITNESS.authorityFloorVersion,
    expectedHistorySha256: witness.expectedHistorySha256 === RUNTIME_SCHEMA_WITNESS.expectedHistorySha256,
    historySha256: witness.historySha256 === RUNTIME_SCHEMA_WITNESS.expectedHistorySha256,
    expectedLiveMaxVersion: witness.expectedLiveMaxVersion === RUNTIME_SCHEMA_WITNESS.expectedLiveMaxVersion,
    liveMaxVersion: witness.liveMaxVersion === RUNTIME_SCHEMA_WITNESS.expectedLiveMaxVersion,
    expectedHistoryCount: Number(witness.expectedHistoryCount) === RUNTIME_SCHEMA_WITNESS.expectedHistoryCount,
    historyCount: Number(witness.historyCount) === RUNTIME_SCHEMA_WITNESS.expectedHistoryCount,
    expectedPgjwtInstalled: witness.expectedPgjwtInstalled === RUNTIME_SCHEMA_WITNESS.expectedPgjwtInstalled,
    pgjwtInstalled: witness.pgjwtInstalled === RUNTIME_SCHEMA_WITNESS.expectedPgjwtInstalled,
    expectedPgjwtVersion: witness.expectedPgjwtVersion === RUNTIME_SCHEMA_WITNESS.expectedPgjwtVersion,
    pgjwtVersion: witness.pgjwtVersion === RUNTIME_SCHEMA_WITNESS.expectedPgjwtVersion,
    schemaVerified: witness.verified === true,
    noMissingContracts: Array.isArray(payload?.missing) && payload.missing.length === 0,
  };

  return {
    verified: Object.values(checks).every(Boolean),
    checks,
    witness,
    contracts: Array.isArray(payload?.contracts) ? payload.contracts : [],
    missing: Array.isArray(payload?.missing) ? payload.missing : null,
  };
}

export async function verifySupabaseRuntimeContractHealth(options = {}) {
  const url = clean(options.url ?? options.env?.SUPABASE_RUNTIME_HEALTH_URL ?? process.env.SUPABASE_RUNTIME_HEALTH_URL) || DEFAULT_URL;
  const evidencePath = clean(options.evidencePath ?? options.env?.SUPABASE_RUNTIME_HEALTH_EVIDENCE_PATH ?? process.env.SUPABASE_RUNTIME_HEALTH_EVIDENCE_PATH) || DEFAULT_EVIDENCE_PATH;
  const fetchImpl = options.fetchImpl ?? fetch;
  const evidence = {
    schemaVersion: 1,
    verified: false,
    status: 'initializing',
    url,
    expected: RUNTIME_SCHEMA_WITNESS,
    httpStatus: null,
    checks: null,
    witness: null,
    contracts: [],
    missing: null,
    checkedAt: new Date().toISOString(),
  };

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'error',
    });
    evidence.httpStatus = response.status;
  } catch (error) {
    evidence.status = 'request-failed';
    evidence.error = errorMessage(error);
    evidence.checkedAt = new Date().toISOString();
    await writeEvidence(evidencePath, evidence);
    throw new Error(`SUPABASE_RUNTIME_HEALTH_REQUEST_FAILED: ${errorMessage(error)}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    evidence.status = 'invalid-json';
    evidence.error = errorMessage(error);
    evidence.checkedAt = new Date().toISOString();
    await writeEvidence(evidencePath, evidence);
    throw new Error('SUPABASE_RUNTIME_HEALTH_INVALID_JSON');
  }

  const evaluated = evaluateRuntimeContractHealth(payload);
  evidence.checks = evaluated.checks;
  evidence.witness = evaluated.witness;
  evidence.contracts = evaluated.contracts;
  evidence.missing = evaluated.missing;
  evidence.verified = response.ok && evaluated.verified;
  evidence.status = evidence.verified ? 'verified' : 'drift';
  evidence.checkedAt = new Date().toISOString();
  await writeEvidence(evidencePath, evidence);

  if (!evidence.verified) {
    const failedChecks = Object.entries(evaluated.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)
      .join(',');
    throw new Error(
      `SUPABASE_RUNTIME_SCHEMA_WITNESS_DRIFT: http=${response.status}; failed=${failedChecks || 'unknown'}`,
    );
  }

  return evidence;
}

async function main() {
  const evidence = await verifySupabaseRuntimeContractHealth();
  console.log(JSON.stringify(evidence, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}
