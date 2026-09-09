/**
 * delete-account compatibility endpoint
 *
 * The repository's canonical account-deletion system is the seven-day,
 * cancellable request flow processed by `account-delete`. This legacy endpoint
 * is retained for compatibility with clients that may still call
 * `/functions/v1/delete-account`, but it only schedules the canonical request.
 * It never performs direct table deletes or deletes an Auth user.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return json({ error: 'server_config' }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await db.auth.getUser();
  const userId = authData.user?.id;
  if (authError || !userId) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({})) as { confirmed?: boolean };
  if (body.confirmed !== true) return json({ error: 'confirmation_required' }, 400);

  const { data: existing, error: lookupError } = await db
    .from('account_deletion_requests')
    .select('id,status,requested_at,scheduled_for')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .maybeSingle();

  if (lookupError) return json({ error: 'request_lookup_failed' }, 500);
  if (existing) {
    return json({
      ok: true,
      request: existing,
      alreadyExists: true,
      compatibilityEndpoint: true,
    });
  }

  const { data: request, error: requestError } = await db
    .from('account_deletion_requests')
    .insert({ user_id: userId, status: 'pending' })
    .select('id,status,requested_at,scheduled_for')
    .single();

  if (requestError) return json({ error: 'request_failed' }, 500);

  return json({
    ok: true,
    request,
    alreadyExists: false,
    compatibilityEndpoint: true,
  }, 202);
});
