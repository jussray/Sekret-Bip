import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type FirebaseAppCheckMode = 'off' | 'observe' | 'enforce';
export type FirebaseAppCheckModeState = FirebaseAppCheckMode | 'invalid';

export interface FirebaseAppCheckEnv {
  FIREBASE_APPCHECK_MODE?: string;
  /** Numeric Firebase project number, not the human-readable project ID. */
  FIREBASE_PROJECT_NUMBER?: string;
  /** Expected Firebase web app ID, for example 1:123456789012:web:abc123. */
  FIREBASE_WEB_APP_ID?: string;
}

export type FirebaseAppCheckStatus =
  | 'disabled'
  | 'missing'
  | 'valid'
  | 'invalid'
  | 'verification_error';

export type FirebaseAppCheckReason =
  | 'header_missing'
  | 'expired'
  | 'malformed'
  | 'invalid_signature'
  | 'invalid_claims'
  | 'unexpected_app'
  | 'jwks_unavailable'
  | 'misconfigured'
  | 'verification_failed';

export interface FirebaseAppCheckVerification {
  status: FirebaseAppCheckStatus;
  reason?: FirebaseAppCheckReason;
  appId?: string;
}

const APP_CHECK_JWKS_URL = new URL('https://firebaseappcheck.googleapis.com/v1/jwks');
const APP_CHECK_ISSUER = 'https://firebaseappcheck.googleapis.com';
const MAX_APP_CHECK_TOKEN_LENGTH = 16_384;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

let remoteJwks: JWTVerifyGetKey | undefined;

function getRemoteJwks(): JWTVerifyGetKey {
  if (!remoteJwks) {
    remoteJwks = createRemoteJWKSet(APP_CHECK_JWKS_URL, {
      timeoutDuration: 5_000,
      cooldownDuration: 30_000,
      // Firebase permits caching the App Check JWK set for up to six hours.
      cacheMaxAge: 6 * 60 * 60 * 1_000,
    });
  }
  return remoteJwks;
}

export function firebaseAppCheckMode(env: FirebaseAppCheckEnv): FirebaseAppCheckModeState {
  const raw = env.FIREBASE_APPCHECK_MODE?.trim().toLowerCase();
  if (!raw) return 'off';
  if (raw === 'off' || raw === 'observe' || raw === 'enforce') return raw;
  return 'invalid';
}

function configuredProjectNumber(env: FirebaseAppCheckEnv): string | null {
  const value = env.FIREBASE_PROJECT_NUMBER?.trim() ?? '';
  return /^\d+$/.test(value) ? value : null;
}

function configuredAppId(env: FirebaseAppCheckEnv): string | null {
  const value = env.FIREBASE_WEB_APP_ID?.trim() ?? '';
  return value || null;
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code ?? '');
}

function validVerification(appId: string): FirebaseAppCheckVerification {
  return { status: 'valid', appId };
}

function classifyVerificationError(error: unknown): FirebaseAppCheckVerification {
  const code = errorCode(error);

  if (code === 'ERR_JWT_EXPIRED') {
    return { status: 'invalid', reason: 'expired' };
  }
  if (code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' || code === 'ERR_JWKS_NO_MATCHING_KEY') {
    return { status: 'invalid', reason: 'invalid_signature' };
  }
  if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
    return { status: 'invalid', reason: 'invalid_claims' };
  }
  if (
    code === 'ERR_JWS_INVALID'
    || code === 'ERR_JWT_INVALID'
    || code === 'ERR_JOSE_ALG_NOT_ALLOWED'
    || code === 'ERR_JOSE_NOT_SUPPORTED'
  ) {
    return { status: 'invalid', reason: 'malformed' };
  }
  if (code === 'ERR_JWKS_TIMEOUT' || error instanceof TypeError) {
    return { status: 'verification_error', reason: 'jwks_unavailable' };
  }

  return { status: 'verification_error', reason: 'verification_failed' };
}

/**
 * Verify Firebase App Check independently from Supabase authentication.
 * A valid result is only app-attestation evidence. It never creates a user
 * principal, grants route authority, or substitutes for Supabase JWT/RLS checks.
 */
export async function verifyFirebaseAppCheck(
  request: Request,
  env: FirebaseAppCheckEnv,
): Promise<FirebaseAppCheckVerification> {
  const mode = firebaseAppCheckMode(env);
  if (mode === 'off') return { status: 'disabled' };
  if (mode === 'invalid') return { status: 'verification_error', reason: 'misconfigured' };

  const projectNumber = configuredProjectNumber(env);
  const expectedAppId = configuredAppId(env);
  if (!projectNumber || !expectedAppId) {
    return { status: 'verification_error', reason: 'misconfigured' };
  }

  const token = request.headers.get('X-Firebase-AppCheck')?.trim() ?? '';
  if (!token) return { status: 'missing', reason: 'header_missing' };
  if (token.length > MAX_APP_CHECK_TOKEN_LENGTH || !JWT_SHAPE.test(token)) {
    return { status: 'invalid', reason: 'malformed' };
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(token, getRemoteJwks(), {
      algorithms: ['RS256'],
      issuer: `${APP_CHECK_ISSUER}/${projectNumber}`,
      audience: `projects/${projectNumber}`,
      typ: 'JWT',
      clockTolerance: 5,
    });

    // jwtVerify already enforces the algorithm/typ allowlists above. Keep these
    // explicit checks as defense-in-depth and executable documentation.
    if (protectedHeader.alg !== 'RS256' || protectedHeader.typ !== 'JWT') {
      return { status: 'invalid', reason: 'invalid_claims' };
    }

    if (payload.sub !== expectedAppId) {
      return { status: 'invalid', reason: 'unexpected_app' };
    }

    return validVerification(expectedAppId);
  } catch (error) {
    const classified = classifyVerificationError(error);
    if (classified.status !== 'invalid' && classified.status !== 'verification_error') {
      throw new Error('Firebase App Check caught verification errors must fail closed.');
    }
    return classified;
  }
}
