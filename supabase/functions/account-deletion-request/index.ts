// supabase/functions/account-deletion-request/index.ts
// Creates a reversible deletion request with a seven-day grace period.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSupabasePublishableKey } from '../_shared/supabase-api-keys.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const key = getSupabasePublishableKey();
  if (!url || !key) return json({ error: 'server_config' }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await db.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({})) as { confirmed?: boolean };
  if (body.confirmed !== true) return json({ error: 'confirmation_required' }, 400);

  const { data: existing, error: lookupError } = await db
    .from('account_deletion_requests')
    .select('id,status,requested_at,scheduled_for')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .maybeSingle();

  if (lookupError) return json({ error: 'request_lookup_failed' }, 500);
  if (existing) return json({ ok: true, request: existing, alreadyExists: true });

  const { data, error } = await db
    .from('account_deletion_requests')
    .insert({ user_id: userId, status: 'pending' })
    .select('id,status,requested_at,scheduled_for')
    .single();

  if (error) return json({ error: 'request_failed' }, 500);
  return json({ ok: true, request: data }, 201);
});
