// Se'kret Bip — invokes the account-delete Edge Function for every deletion
// request whose seven-day grace period has expired. Run on a schedule; the
// account-delete function is the trusted admin job this script triggers.
//
// Required env:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   ACCOUNT_DELETION_PROCESS_SECRET

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROCESS_SECRET = process.env.ACCOUNT_DELETION_PROCESS_SECRET || '';

function fail(message) {
  console.error(`sweep-account-deletions: ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL) fail('missing SUPABASE_URL');
if (!SERVICE_ROLE_KEY) fail('missing SUPABASE_SERVICE_ROLE_KEY');
if (!PROCESS_SECRET) fail('missing ACCOUNT_DELETION_PROCESS_SECRET');

async function fetchExpiredPendingRequests() {
  const nowIso = new Date().toISOString();
  const query = new URLSearchParams({
    select: 'id',
    status: 'eq.pending',
    scheduled_for: `lte.${nowIso}`,
    order: 'scheduled_for.asc',
    limit: '500',
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/account_deletion_requests?${query}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`list_failed:${response.status}:${body.slice(0, 300)}`);
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
  const requestIds = await fetchExpiredPendingRequests();
  console.log(`sweep-account-deletions: found ${requestIds.length} expired pending request(s).`);

  const results = [];
  for (const requestId of requestIds) {
    // Sequential on purpose: each call deletes an Auth user and storage
    // objects, and there is no reason to parallelize destructive admin work.
    const result = await processRequest(requestId);
    results.push(result);
    console.log(`  ${result.ok ? 'ok' : 'FAILED'} ${requestId} -> ${result.status} ${result.ok ? '' : result.body}`);
  }

  const failures = results.filter((result) => !result.ok);
  if (failures.length > 0) {
    fail(`${failures.length} of ${results.length} deletion request(s) failed; see log above.`);
  }
  console.log(`sweep-account-deletions: processed ${results.length} request(s) successfully.`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
