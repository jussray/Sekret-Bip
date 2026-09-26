import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const REQUIRED_CONTRACTS = [
  { contractKey: 'consent_deletion_runtime_truth', version: '20260715060000' },
] as const;

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
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ healthy: false, error: 'server_config' }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const requiredKeys = REQUIRED_CONTRACTS.map(contract => contract.contractKey);
  const { data, error } = await admin
    .from('runtime_contract_versions')
    .select('contract_key,version,applied_at')
    .in('contract_key', requiredKeys);

  if (error) {
    return json({ healthy: false, error: 'contract_lookup_failed' }, 503);
  }

  const current = new Map(
    (data ?? []).map(row => [String(row.contract_key), {
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

  return json({
    healthy: missing.length === 0,
    contracts,
    missing,
  }, missing.length === 0 ? 200 : 503);
});
