/**
 * Worker authentication middleware.
 *
 * Strategy chain, tried in order against the `Authorization: Bearer <token>`
 * value:
 *   1. Supabase JWT → per-user auth verified against the project issuer.
 *      Anonymous Supabase sessions are rejected at this boundary.
 *   2. Shared token → explicit guest/client credential matching
 *      SEKRET_CLIENT_TOKEN with a constant-time comparison.
 *
 * Production is fail-closed by default. Token-less access exists only when
 * SEKRET_AUTH_MODE=dev-open is explicitly set for local development.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

export interface AuthEnv {
  /** Shared guest/client token. Must match EXPO_PUBLIC_BACKEND_TOKEN callers. */
  SEKRET_CLIENT_TOKEN?: string;
  /** Supabase project URL, used to derive the JWKS URL and expected issuer. */
  SUPABASE_URL?: string;
  /** Optional legacy HS256 signing secret. */
  SUPABASE_JWT_SECRET?: string;
  /** Explicit local-development escape hatch. Secure default is `required`. */
  SEKRET_AUTH_MODE?: 'required' | 'dev-open';
}

export type Principal =
  | { kind: 'shared-token' }
  | { kind: 'user'; userId: string };

export type AuthResult =
  | { ok: true; principal: Principal }
  | { ok: false; status: 401 | 403 | 503; error: string };

/** Constant-time comparison of two equal-length strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Pull the raw token out of an `Authorization: Bearer <token>` header. */
export function extractBearer(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** A JWT is three non-empty base64url segments separated by dots. */
export function looksLikeJwt(token: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

const jwksCache = new Map<string, JWTVerifyGetKey>();

function getJwks(supabaseUrl: string): JWTVerifyGetKey {
  const jwksUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
  let jwks = jwksCache.get(jwksUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUrl));
    jwksCache.set(jwksUrl, jwks);
  }
  return jwks;
}

async function verifySupabaseJwt(token: string, env: AuthEnv): Promise<JWTPayload | null> {
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  if (!supabaseUrl) return null;

  const options = {
    issuer: `${supabaseUrl}/auth/v1`,
    audience: 'authenticated',
  };
  try {
    if (env.SUPABASE_JWT_SECRET) {
      const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, options);
      return payload;
    }
    const { payload } = await jwtVerify(token, getJwks(supabaseUrl), options);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authenticate an API request. Secure behavior is the default:
 * - valid permanent-account Supabase JWT → user principal
 * - valid anonymous Supabase JWT → 403
 * - exact shared token → guest/client principal
 * - missing credential → 401
 * - invalid credential → 403
 * - no server-side verification strategy → 503
 *
 * `dev-open` is intentionally explicit and only permits a missing token. An
 * invalid token is never converted into an authenticated principal.
 */
export async function authenticate(request: Request, env: AuthEnv): Promise<AuthResult> {
  const token = extractBearer(request);
  const sharedToken = env.SEKRET_CLIENT_TOKEN?.trim() ?? '';
  const hasJwtVerifier = Boolean(env.SUPABASE_URL?.trim());
  const devOpen = env.SEKRET_AUTH_MODE === 'dev-open';

  if (token && hasJwtVerifier && looksLikeJwt(token)) {
    const payload = await verifySupabaseJwt(token, env);
    if (payload?.is_anonymous === true) {
      return { ok: false, status: 403, error: 'anonymous user token not permitted' };
    }
    if (payload?.sub) return { ok: true, principal: { kind: 'user', userId: payload.sub } };
    return { ok: false, status: 403, error: 'invalid token' };
  }

  if (token && sharedToken && timingSafeEqual(token, sharedToken)) {
    return { ok: true, principal: { kind: 'shared-token' } };
  }

  if (!token && devOpen) {
    return { ok: true, principal: { kind: 'shared-token' } };
  }

  if (!hasJwtVerifier && !sharedToken) {
    console.error('[auth] no server-side verification strategy configured');
    return { ok: false, status: 503, error: 'authentication unavailable' };
  }

  if (!token) return { ok: false, status: 401, error: 'missing bearer token' };
  return { ok: false, status: 403, error: 'invalid token' };
}
