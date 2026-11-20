import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSupabasePublishableKey, getSupabaseSecretKey } from '../_shared/supabase-api-keys.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PushEvent = 'parent_bridge_share' | 'parent_bridge_reply';

type PushRequest = {
  event?: string;
  teenId?: string;
};

const ALLOWED_EVENTS = new Set<PushEvent>([
  'parent_bridge_share',
  'parent_bridge_reply',
]);

const EVENT_TEMPLATES: Record<PushEvent, { title: string; body: string; url: string }> = {
  parent_bridge_share: {
    title: "Se'kret Bip Parent",
    body: 'Your teen shared something with you in Parent Bridge.',
    url: '/(parent)/bridge',
  },
  parent_bridge_reply: {
    title: "Se'kret Bip",
    body: 'Your parent left you a reply in Parent Bridge.',
    url: '/(teen)/bridge',
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'A signed-in user is required.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: 'Push service is not configured.' }, 503);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return json({ error: 'Invalid or expired session.' }, 401);

  let payload: PushRequest;
  try {
    payload = await request.json() as PushRequest;
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const rawEvent = payload.event;
  if (typeof rawEvent !== 'string' || !ALLOWED_EVENTS.has(rawEvent as PushEvent)) {
    return json({ error: 'Unsupported notification event.' }, 400);
  }
  const event = rawEvent as PushEvent;

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  let recipientUserId: string;

  if (event === 'parent_bridge_share') {
    const { data: link, error } = await admin
      .from('parent_links')
      .select('parent_user_id')
      .eq('teen_user_id', user.id)
      .eq('status', 'active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return json({ error: 'Unable to resolve linked parent.' }, 500);
    if (!link?.parent_user_id) return json({ sent: 0, message: 'No active linked parent found.' });
    recipientUserId = link.parent_user_id;
  } else {
    const teenId = payload.teenId?.trim();
    if (!teenId) return json({ error: 'teenId is required.' }, 400);

    const { data: link, error } = await admin
      .from('parent_links')
      .select('teen_user_id')
      .eq('parent_user_id', user.id)
      .eq('teen_user_id', teenId)
      .eq('status', 'active')
      .eq('is_active', true)
      .maybeSingle();

    if (error) return json({ error: 'Unable to verify linked teen.' }, 500);
    if (!link?.teen_user_id) return json({ error: 'No active parent link found.' }, 403);
    recipientUserId = link.teen_user_id;
  }

  const cutoff = new Date(Date.now() - 30_000).toISOString();
  const { count, error: throttleError } = await admin
    .from('notification_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('sender_user_id', user.id)
    .eq('event_type', event)
    .gte('created_at', cutoff);

  if (throttleError) return json({ error: 'Unable to enforce notification cooldown.' }, 500);
  if ((count ?? 0) >= 3) return json({ error: 'Notification cooldown active.' }, 429);

  const { data: rows, error: tokenError } = await admin
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', recipientUserId)
    .eq('enabled', true);

  if (tokenError) return json({ error: 'Unable to load push tokens.' }, 500);
  const tokens = (rows ?? []).map((row) => row.expo_push_token).filter(Boolean);
  if (tokens.length === 0) return json({ sent: 0, message: 'No enabled devices found.' });

  const template = EVENT_TEMPLATES[event];
  const messages = tokens.map((to) => ({
    to,
    title: template.title,
    body: template.body,
    sound: 'default',
    data: { url: template.url },
  }));

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  const result = await expoResponse.json().catch(() => null);

  if (!expoResponse.ok) {
    return json({ error: 'Expo rejected the push request.', details: result }, 502);
  }

  await admin.from('notification_deliveries').insert({
    sender_user_id: user.id,
    recipient_user_id: recipientUserId,
    event_type: event,
  });

  return json({ sent: tokens.length, result });
});
