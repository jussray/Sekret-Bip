/**
 * src/utils/backendAuth.ts
 *
 * Resolves the bearer credential for Cloudflare Worker backend calls.
 *
 * Preference order:
 *   1. The signed-in user's Supabase access token (per-user JWT auth) — the
 *      Worker verifies it against the Supabase JWKS and keys rate limits by user.
 *   2. The shared client token (EXPO_PUBLIC_BACKEND_TOKEN) for guests /
 *      unauthenticated flows, or when no session exists.
 *
 * Firebase App Check is a separate app-attestation signal. It never becomes
 * identity or authorization and is attached only from the canonical provider.
 *
 * This is the single place the backend request-credential policy lives; every
 * protected client call uses backendAuthHeaders(). Kept separate from env.ts to
 * avoid a circular import (this module depends on the Supabase client, which
 * depends on env.ts).
 */
import { firebaseAppCheckHeaders } from '@/services/firebase/appCheck';
import { getSupabase } from './supabase';
import { BACKEND_TOKEN, backendHeaders } from './env';

/** The current user's Supabase access token, or the shared token as fallback. */
export async function resolveBackendToken(): Promise<string> {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) return accessToken;
    }
  } catch {
    // Session lookup failed (storage error, etc.) — fall back to shared token.
  }
  return BACKEND_TOKEN;
}

/**
 * Backend request headers with independent identity and app-attestation signals.
 * Caller-provided headers cannot select or spoof X-Firebase-AppCheck.
 */
export async function backendAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const safeExtra = { ...(extra ?? {}) };
  delete safeExtra['X-Firebase-AppCheck'];

  const [token, appCheckHeaders] = await Promise.all([
    resolveBackendToken(),
    firebaseAppCheckHeaders(),
  ]);

  return backendHeaders(token, {
    ...safeExtra,
    ...appCheckHeaders,
  });
}
