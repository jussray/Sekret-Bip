import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSupabasePublishableKey } from '../_shared/supabase-api-keys.ts';

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return respond({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const key = getSupabasePublishableKey();
  if (!url || !key) return respond({ error: 'server_config' }, 500);

  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await client.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return respond({ error: 'unauthorized' }, 401);

  const changedAt = new Date().toISOString();
  const { data, error } = await client
    .from('account_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: changedAt })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('id,status,cancelled_at')
    .maybeSingle();

  if (error) return respond({ error: 'update_failed' }, 500);
  if (!data) return respond({ error: 'pending_request_not_found' }, 404);

  return respond({ ok: true, request: data });
});
