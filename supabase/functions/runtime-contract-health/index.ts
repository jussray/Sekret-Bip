import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enforceServerEdgeRateLimit } from '../_shared/edge-rate-limit.ts';
import { getSupabaseSecretKey } from '../_shared/supabase-api-keys.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SECRET_KEY = getSupabaseSecretKey() ?? '';

const REQUIRED_CONTRACTS = [
  { contractKey: 'consent_deletion_runtime_truth', version: '20260715060000' },
] as const;

const SCHEMA_WITNESS = Object.freeze({
  contractVersion: '20260927185000',
  authorityFloorVersion: '20260805170500',
  expectedHistorySha256: 'f187b6741a15c51970f68ff0b6aa7de02407ada8d72af4330eeb7d210429b3a3',
  expectedLiveMaxVersion: '20260927185000',
  expectedHistoryCount: 32,
  expectedPgjwtInstalled: true,
  expectedPgjwtVersion: '0.2.0',
});

type SchemaWitnessRow = {
  schemaVersion?: number;
  authorityFloorVersion?: string;
  historySha256?: string;
  liveMaxVersion?: string;
  historyCount?: number;
  pgjwtInstalled?: boolean;
  pgjwtVersion?: string | null;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return json({ healthy: false, error: 'server_config' }, 500);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const limited = await enforceServerEdgeRateLimit(admin, 'runtime-contract-health');
  if (limited) return limited;

  const requiredKeys = REQUIRED_CONTRACTS.map(contract => contract.contractKey);
  const [contractsResult, schemaResult] = await Promise.all([
    admin
      .from('runtime_contract_versions')
      .select('contract_key,version,applied_at')
      .in('contract_key', requiredKeys),
    admin.rpc('sekret_production_schema_witness'),
  ]);

  if (contractsResult.error) {
    return json({ healthy: false, error: 'contract_lookup_failed' }, 503);
  }
  if (schemaResult.error) {
    return json({
      healthy: false,
      error: 'schema_witness_lookup_failed',
      schemaWitness: {
        contractVersion: SCHEMA_WITNESS.contractVersion,
        verified: false,
      },
    }, 503);
  }

  const current = new Map(
    (contractsResult.data ?? []).map(row => [String(row.contract_key), {
      version: String(row.version),
      appliedAt: String(row.applied_at),
    }]),
  );

  const missing = REQUIRED_CONTRACTS
    .filter(contract => current.get(contract.contractKey)?.version !== contract.version)
    .map(contract => ({
      contractKey: contract.contractKey,
      expectedVersion: contract.version,
      actualVersion: current.get(contract.contractKey)?.version ?? null,
    }));

  const contracts = REQUIRED_CONTRACTS.map(contract => ({
    contractKey: contract.contractKey,
    expectedVersion: contract.version,
    actualVersion: current.get(contract.contractKey)?.version ?? null,
    appliedAt: current.get(contract.contractKey)?.appliedAt ?? null,
  }));

  const observed = (schemaResult.data ?? {}) as SchemaWitnessRow;
  const schemaVerified = observed.schemaVersion === 1
    && observed.authorityFloorVersion === SCHEMA_WITNESS.authorityFloorVersion
    && observed.historySha256 === SCHEMA_WITNESS.expectedHistorySha256
    && observed.liveMaxVersion === SCHEMA_WITNESS.expectedLiveMaxVersion
    && Number(observed.historyCount) === SCHEMA_WITNESS.expectedHistoryCount
    && observed.pgjwtInstalled === SCHEMA_WITNESS.expectedPgjwtInstalled
    && observed.pgjwtVersion === SCHEMA_WITNESS.expectedPgjwtVersion;

  const schemaWitness = {
    contractVersion: SCHEMA_WITNESS.contractVersion,
    authorityFloorVersion: SCHEMA_WITNESS.authorityFloorVersion,
    expectedHistorySha256: SCHEMA_WITNESS.expectedHistorySha256,
    historySha256: observed.historySha256 ?? null,
    expectedLiveMaxVersion: SCHEMA_WITNESS.expectedLiveMaxVersion,
    liveMaxVersion: observed.liveMaxVersion ?? null,
    expectedHistoryCount: SCHEMA_WITNESS.expectedHistoryCount,
    historyCount: Number(observed.historyCount ?? 0),
    expectedPgjwtInstalled: SCHEMA_WITNESS.expectedPgjwtInstalled,
    pgjwtInstalled: observed.pgjwtInstalled ?? null,
    expectedPgjwtVersion: SCHEMA_WITNESS.expectedPgjwtVersion,
    pgjwtVersion: observed.pgjwtVersion ?? null,
    verified: schemaVerified,
  };

  const healthy = missing.length === 0 && schemaVerified;
  return json({
    healthy,
    contracts,
    missing,
    schemaWitness,
  }, healthy ? 200 : 503);
});
