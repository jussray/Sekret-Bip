/**
 * src/utils/env.ts
 * Se'kret Bip — Environment variable validation (canonical location)
 *
 * Rules:
 *   - Only EXPO_PUBLIC_* vars are allowed in client code.
 *   - OPENAI_API_KEY lives ONLY in the Cloudflare Worker.
 *   - service_role keys must NEVER appear here.
 *
 * Call validateEnv() once at app startup (app/_layout.tsx).
 */

function clean(value: string | undefined): string {
  return value?.trim() ?? '';
}

// ── Resolved values ──────────────────────────────────────────────────────────
// Expo only inlines public variables when they are referenced statically as
// process.env.EXPO_PUBLIC_* with dot notation. Do not alias, destructure, or use
// bracket notation for these reads: the browser bundle would receive blanks.
export const SUPABASE_URL = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);

// Prefer the modern publishable-key variable while retaining the legacy anon
// name for older EAS and Cloudflare environments.
export const SUPABASE_ANON =
  clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  || clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const BACKEND_URL = clean(process.env.EXPO_PUBLIC_BACKEND_URL);
/**
 * Shared client token for the Cloudflare Worker backend. Sent as
 * `Authorization: Bearer <token>` by backendHeaders(). Safe to ship in the
 * client bundle (it is a coarse abuse speed-bump, not a per-user credential);
 * the Worker enforces it only when its matching SEKRET_CLIENT_TOKEN secret is
 * set. Leave unset and the app calls the backend unauthenticated as before.
 */
export const BACKEND_TOKEN = clean(process.env.EXPO_PUBLIC_BACKEND_TOKEN);

/**
 * Canonical headers for Worker backend calls. Always JSON; attaches `token` as
 * a bearer credential when non-empty. Defaults to the shared BACKEND_TOKEN, but
 * callers pass the user's Supabase access token when signed in — see
 * backendAuthHeaders() in ./backendAuth. Kept synchronous and token-agnostic so
 * the token-resolution policy lives in one place.
 */
export function backendHeaders(token: string = BACKEND_TOKEN, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ── Flags ────────────────────────────────────────────────────────────────────
export const isSupabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON);
export const isBackendReady = Boolean(BACKEND_URL);

const isDev = process.env.NODE_ENV === 'development';

/**
 * validateEnv()
 *
 * Missing SUPABASE vars  → cloud sync disabled, AsyncStorage only.
 * Missing BACKEND_URL    → AI replies fall back to pre-written companion
 *                          replies (see fallbackReply() in ./api). Fine for
 *                          local dev; deploy the Worker before real launch.
 * Banned keys present    → security violation logged.
 *
 * Note: missing-config cases use console.warn, not console.error — in Expo
 * web dev, console.error triggers a full-screen LogBox overlay that blocks
 * all interaction with the app underneath it.
 */
export function validateEnv(): void {
  // ── Required for cloud sync ──────────────────────────────────────────────
  if (!SUPABASE_URL) {
    console.warn(
      "[Se'kret Bip] ⚠️  EXPO_PUBLIC_SUPABASE_URL is not set.\n" +
      '   Cloud sync is disabled. Add it to the deployment environment.'
    );
  }
  if (!SUPABASE_ANON) {
    console.warn(
      "[Se'kret Bip] ⚠️  Supabase publishable key is not set.\n" +
      '   Configure EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the legacy EXPO_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  // ── Backend URL: falls back to pre-written companion replies ────────────
  if (!BACKEND_URL) {
    console.warn(
      "[Se'kret Bip] ℹ️  EXPO_PUBLIC_BACKEND_URL is not set.\n" +
      "   Se'kret AI is running in fallback mode (pre-written replies).\n" +
      '   Set it to your Cloudflare Worker URL after `wrangler deploy` for live AI replies.\n' +
      '   Example: EXPO_PUBLIC_BACKEND_URL=https://sekret-reply.<account>.workers.dev'
    );
  }

  // ── Security: banned keys must never reach the client ────────────────────
  const runtimeEnv = process.env as Record<string, string | undefined>;
  const BANNED = ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE'];
  for (const key of BANNED) {
    if (runtimeEnv[key]) {
      console.error(
        `[Se'kret Bip] 🚨 SECURITY: "${key}" is present in client environment.\n` +
        '   This key must NEVER be in Expo, Vercel, or client code.\n' +
        '   Remove it immediately and rotate the secret.'
      );
    }
  }

  if (isDev && SUPABASE_URL && SUPABASE_ANON && BACKEND_URL) {
    console.log("[Se'kret Bip] ✅ All environment variables configured.");
  }
}
