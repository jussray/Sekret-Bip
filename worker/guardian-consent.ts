import type { Principal } from './auth';

export interface GuardianConsentEnv {
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

// Privileged backend-only authorization. The companion Worker never receives a
// Supabase service key; it receives only the resulting boolean on the verified
// server principal. Any error or missing configuration fails closed.
export async function resolveGuardianSharingConsent(
  env: GuardianConsentEnv,
  principal: Principal | null,
): Promise<boolean> {
  if (!principal || principal.kind !== 'user' || !principal.userId) return false;
  const baseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !serviceKey) return false;

  try {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/guardian_summary_permitted`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_teen_user_id: principal.userId }),
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    return (await response.json()) === true;
  } catch {
    return false;
  }
}
