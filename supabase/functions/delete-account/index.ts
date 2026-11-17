// supabase/functions/delete-account/index.ts
// Se'kret Bip — full account deletion Edge Function (COPPA compliance)
//
// Flow:
//   1. Client POSTs with their user JWT in the Authorization header
//   2. This function verifies the JWT, extracts the user_id
//   3. Deletes any storage objects the user owns (voice notes, etc.)
//   4. Calls admin.deleteUser — Postgres ON DELETE CASCADE removes all table rows
//
// The caller MUST be authenticated (no --no-verify-jwt flag on deploy).
//
// Deployment:
//   supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPA_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPA_ANON    = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')   return json({ error: 'method_not_allowed' }, 405);

  if (!SUPA_URL || !SUPA_SVC_KEY) return json({ error: 'server_misconfigured' }, 500);

  // Verify the caller's JWT using the anon client (respects RLS / JWT verification)
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(SUPA_URL, SUPA_ANON, {
    global: { headers: { Authorization: authHeader } },
    auth:   { persistSession: false },
  });

  const { data: { user }, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  const userId = user.id;

  // Admin client for privileged operations
  const admin = createClient(SUPA_URL, SUPA_SVC_KEY, {
    auth: { persistSession: false },
  });

  // Remove any storage objects the user owns.
  // We iterate known buckets and delete by user_id prefix.
  const BUCKETS = ['voice-notes', 'media'];
  for (const bucket of BUCKETS) {
    const { data: files } = await admin.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await admin.storage.from(bucket).remove(paths);
    }
  }

  // Delete the auth user — Postgres ON DELETE CASCADE removes all table rows.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) {
    return json({ error: deleteErr.message }, 500);
  }

  return json({ message: 'account_deleted' });
});
