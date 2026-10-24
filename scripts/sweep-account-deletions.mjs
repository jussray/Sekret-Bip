// Se'kret Bip — invokes the account-delete Edge Function for every deletion
// request whose seven-day grace period has expired. Run on a schedule; the
// account-delete function is the trusted admin job this script triggers.
//
// Required env:
//   SUPABASE_URL
//   SUPABASE_SECRET_KEY (legacy SUPABASE_SERVICE_ROLE_KEY accepted during migration)
//   ACCOUNT_DELETION_PROCESS_SECRET

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROCESS_SECRET = process.env.ACCOUNT_DELETION_PROCESS_SECRET || '';

function fail(message) {
  console.error(`sweep-account-deletions: ${message}`);
  process.exit(1);
}

// The table's canonical migration lives in public. Without Accept-Profile,
// a PostgREST deployment defaulting to api queries the wrong namespace.
export async function fetchExpiredPendingRequests({
  fetchImpl = fetch,
  baseUrl = SUPABASE_URL,
  serviceKey = SERVICE_ROLE_KEY,
  nowIso = new Date().toISOString(),
} = {}) {
  const query = new URLSearchParams({
    select: 'id',
    status: 'eq.pending',
    scheduled_for: `lte.${nowIso}`,
    order: 'scheduled_for.asc',
    limit: '500',
  });

  const response = await fetchImpl(`${baseUrl}/rest/v1/account_deletion_requests?${query}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'Accept-Profile': 'public',
    },
  });

  const body = await response.text();
  if (!response.ok) {
    let code = 'unknown';
    try { code = String(JSON.parse(body)?.code || 'unknown'); } catch { /* never echo raw API bodies */ }
    if (code === 'PGRST205' || code === 'PGRST106') {
      throw new Error(`schema_public_unavailable:public.account_deletion_requests:http=${response.status}:code=${code}; verify migration and exposed-schema configuration; no deletions attempted`);
    }
    throw new Error(`list_failed:http=${response.status}:code=${code}; no deletions attempted`);
  }
  const rows = body ? JSON.parse(body) : [];
  return Array.isArray(rows) ? rows.map((row) => row.id).filter((id) => typeof id === 'string') : [];
}

async function processRequest(requestId) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/account-delete`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-account-deletion-secret': PROCESS_SECRET,
    },
    body: JSON.stringify({ requestId }),
  });

  const body = await response.text();
  return { requestId, ok: response.ok, status: response.status, body: body.slice(0, 500) };
}

async function main() {
  if (!SUPABASE_URL) fail('missing SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) fail('missing SUPABASE_SECRET_KEY (legacy SUPABASE_SERVICE_ROLE_KEY accepted during migration)');
  if (!PROCESS_SECRET) fail('missing ACCOUNT_DELETION_PROCESS_SECRET');
  const requestIds = await fetchExpiredPendingRequests();
  console.log(`sweep-account-deletions: found ${requestIds.length} expired pending request(s).`);

  const results = [];
  for (const [index, requestId] of requestIds.entries()) {
    // Sequential on purpose: each call deletes an Auth user and storage
    // objects, and there is no reason to parallelize destructive admin work.
    const result = await processRequest(requestId);
    results.push(result);
    // Do not put account request IDs or provider response bodies into public CI logs.
    console.log(`  ${result.ok ? 'ok' : 'FAILED'} request_index=${index + 1} http=${result.status}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    fail(`${failures.length} of ${results.length} deletion request(s) failed; see log above.`);
  }
  console.log(`sweep-account-deletions: processed ${results.length} request(s) successfully.`);
}

// Safe to import in contract tests without triggering a privileged deletion sweep.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
}
