import type { Principal } from './auth';

export interface PushEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  EXPO_ACCESS_TOKEN?: string;
}

type PushTokenRow = {
  expo_push_token: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getUserPushTokens(userId: string, env: PushEnv): Promise<string[]> {
  const baseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceKey) throw new Error('Push storage is not configured.');

  const query = new URL(`${baseUrl}/rest/v1/push_tokens`);
  query.searchParams.set('select', 'expo_push_token');
  query.searchParams.set('user_id', `eq.${userId}`);
  query.searchParams.set('enabled', 'eq.true');

  const response = await fetch(query, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!response.ok) throw new Error(`Push token lookup failed (${response.status}).`);
  const rows = await response.json() as PushTokenRow[];
  return rows.map((row) => row.expo_push_token).filter(Boolean);
}

export async function sendPushToAuthenticatedUser(
  principal: Principal,
  env: PushEnv,
  message: { title: string; body: string; url?: string },
): Promise<Response> {
  if (principal.kind !== 'user') {
    return json({ error: 'A signed-in user is required.' }, 403);
  }

  const tokens = await getUserPushTokens(principal.userId, env);
  if (tokens.length === 0) return json({ sent: 0, message: 'No enabled push tokens found.' });

  const expoMessages = tokens.map((to) => ({
    to,
    title: message.title,
    body: message.body,
    sound: 'default',
    data: message.url ? { url: message.url } : {},
  }));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${env.EXPO_ACCESS_TOKEN}`;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(expoMessages),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) return json({ error: 'Expo push request failed.', details: result }, 502);

  return json({ sent: tokens.length, result });
}
