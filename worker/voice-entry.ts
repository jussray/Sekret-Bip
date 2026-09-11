import observedWorker from './observed-index';
import emailRouter from './email-router';
import { WORKER_RELEASE_SHA } from './release-identity.generated';
import { authenticate, type AuthEnv, type Principal } from './auth';
import {
  firebaseAppCheckMode,
  verifyFirebaseAppCheck,
  type FirebaseAppCheckEnv,
  type FirebaseAppCheckVerification,
} from './firebase-app-check';
import { emitWorkerTelemetry, type WorkerTelemetryEvent } from './telemetry';
import { persistAuditEvent, type AuditPersistEnv } from './audit/persist-event';
import { normalizeReplyActor, resolveRuntimeStyle } from './runtime-style';
import { selectVoiceRoute, type CharacterId } from './voice-routing';
import { synthesizeRoutedVoice, type VoiceProviderEnv } from './voice-providers';

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface WorkerVersionMetadata {
  id: string;
  tag?: string;
  timestamp: string;
}

interface Env extends AuthEnv, VoiceProviderEnv, FirebaseAppCheckEnv {
  ALLOWED_ORIGINS?: string;
  VOICE_PROVIDER_MODE?: 'legacy' | 'cloudflare-only' | 'hybrid';
  SEKRET_RATE_LIMITER?: RateLimit;
  CF_VERSION_METADATA?: WorkerVersionMetadata;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://sekretbip.net',
  'https://www.sekretbip.net',
  'https://app.sekretbip.net',
];

function allowedOrigins(env: Env): string[] | null {
  const configured = env.ALLOWED_ORIGINS?.trim();
  if (!configured || configured === '*') {
    return env.SEKRET_AUTH_MODE === 'dev-open' ? null : DEFAULT_ALLOWED_ORIGINS;
  }
  return configured.split(',').map((value) => value.trim()).filter(Boolean);
}

function securityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
  };
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = allowedOrigins(env);
  const origin = request.headers.get('Origin');
  const allowOrigin = !allowed
    ? '*'
    : origin && allowed.includes(origin)
      ? origin
      : (allowed[0] ?? 'null');
  return {
    ...securityHeaders(),
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-AppCheck',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function withSecurityHeaders(response: Response, headers: Record<string, string>): Response {
  const merged = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) merged.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function originRejected(request: Request, env: Env, cors: Record<string, string>): Response | null {
  const allowed = allowedOrigins(env);
  if (!allowed) return null;
  const origin = request.headers.get('Origin');
  if (!origin || allowed.includes(origin)) return null;
  return json({ error: 'origin not allowed' }, 403, cors);
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return contentType === 'application/json' || contentType.endsWith('+json');
}

function requiresPreciseLipSync(body: Record<string, unknown>): boolean {
  return body.requiresPreciseLipSync === true
    || body.includeTiming === true
    || body.lipSync === 'precise';
}

function protectionUnavailable(cors: Record<string, string>): Response {
  return json(
    { error: 'request protection temporarily unavailable', retryable: true },
    503,
    { ...cors, 'Retry-After': '30' },
  );
}

function appCheckObservationStatus(result: FirebaseAppCheckVerification): number {
  if (result.status === 'valid' || result.status === 'disabled') return 200;
  if (result.status === 'verification_error') return 503;
  return 401;
}

function observeAppCheck(
  request: Request,
  result: FirebaseAppCheckVerification,
  mode: ReturnType<typeof firebaseAppCheckMode>,
  started: number,
): void {
  const url = new URL(request.url);
  const requestId = request.headers.get('CF-Ray') || undefined;
  const event: WorkerTelemetryEvent = {
    fingerprint: `worker_app_check_${result.status}`,
    route: url.pathname,
    method: request.method,
    status: appCheckObservationStatus(result),
    duration_ms: Date.now() - started,
    provider: 'firebase',
    operation: 'app_check',
    error_name: result.reason,
    request_id: requestId,
    fallback_used: false,
    retry_count: 0,
    trace_id: requestId || crypto.randomUUID(),
    policy_version: 'firebase-app-check-v1',
    decision: mode === 'observe' || result.status === 'valid' ? 'allow' : 'block',
    violation_codes: result.reason ? [`app_check_${result.reason}`] : undefined,
  };
  // Never log the bearer App Check token or decoded token body. Cloudflare
  // receives only the privacy-safe verification classification and reason.
  emitWorkerTelemetry(event);
}

function appCheckDenied(
  result: FirebaseAppCheckVerification,
  cors: Record<string, string>,
): Response {
  if (result.status === 'verification_error') {
    return json(
      {
        error: 'app attestation verification temporarily unavailable',
        code: result.reason ?? 'verification_error',
        retryable: true,
      },
      503,
      { ...cors, 'Retry-After': '30' },
    );
  }
  return json(
    {
      error: 'app attestation required',
      code: result.reason ?? 'app_check_failed',
      retryable: false,
    },
    401,
    cors,
  );
}

async function enforceRateLimit(
  request: Request,
  env: Env,
  principal: Principal,
  cors: Record<string, string>,
): Promise<Response | null> {
  if (!env.SEKRET_RATE_LIMITER) {
    if (env.SEKRET_AUTH_MODE === 'dev-open') return null;
    console.error('[voice-entry:rate-limit] SEKRET_RATE_LIMITER binding unavailable');
    return protectionUnavailable(cors);
  }
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const key = principal.kind === 'user' ? `user:${principal.userId}` : `ip:${ip}`;
  try {
    const { success } = await env.SEKRET_RATE_LIMITER.limit({ key });
    return success ? null : json({ error: 'rate limit exceeded', retryable: true }, 429, cors);
  } catch (error) {
    console.error('[voice-entry:rate-limit]', error);
    return protectionUnavailable(cors);
  }
}

function withoutRateLimiter(env: Env): Env {
  if (!env.SEKRET_RATE_LIMITER) return env;
  return { ...env, SEKRET_RATE_LIMITER: undefined };
}

function observeFrontDoorDenial(
  request: Request,
  response: Response,
  env: Env,
  ctx: MinimalExecutionContext,
  started: number,
  fingerprint: 'worker_auth_failure' | 'worker_rate_limit',
): Response {
  const url = new URL(request.url);
  const requestId = request.headers.get('CF-Ray') || undefined;
  const event: WorkerTelemetryEvent = {
    fingerprint,
    route: url.pathname,
    method: request.method,
    status: response.status,
    duration_ms: Date.now() - started,
    provider: 'cloudflare',
    operation: 'security',
    request_id: requestId,
    fallback_used: false,
    retry_count: 0,
    trace_id: requestId || crypto.randomUUID(),
  };
  emitWorkerTelemetry(event);
  ctx.waitUntil(persistAuditEvent(event, env as AuditPersistEnv));
  return response;
}

function workerVersionEvidence(env: Env) {
  const version = env.CF_VERSION_METADATA;
  if (!version) return null;
  return {
    id: version.id,
    tag: version.tag ?? null,
    timestamp: version.timestamp,
  };
}

async function handleVoice(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  if (!hasJsonContentType(request)) return json({ error: 'content-type must be application/json' }, 415, cors);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const text = (
    typeof body.reply === 'string' ? body.reply
      : typeof body.text === 'string' ? body.text
        : ''
  ).trim();
  if (!text) return json({ error: 'reply is required' }, 400, cors);

  const actorId = normalizeReplyActor(body.characterId ?? body.personality);
  if (!actorId) {
    return json({ error: 'characterId must be suhana, sy, cloud, night, sekret, or parentCoach' }, 400, cors);
  }

  const mode = env.VOICE_PROVIDER_MODE ?? 'legacy';
  if (mode === 'legacy') {
    const response = await observedWorker.fetch(request, env as never, { waitUntil() {} });
    return withSecurityHeaders(response, cors);
  }

  const requestedCharacter = typeof body.characterId === 'string'
    ? body.characterId.trim().toLowerCase() as CharacterId
    : actorId as CharacterId;
  const route = selectVoiceRoute({
    characterId: requestedCharacter,
    requiresPreciseLipSync: mode === 'hybrid' && requiresPreciseLipSync(body),
  });

  try {
    const result = await synthesizeRoutedVoice(route, text, env);
    const style = resolveRuntimeStyle(actorId);
    return json({
      audioBase64: result.audioBase64,
      contentType: result.contentType,
      characterId: route.canonicalCharacterId,
      actorRole: style.role,
      voiceProvider: result.provider,
      primaryVoiceProvider: result.primaryProvider,
      voiceSource: result.provider,
      voiceId: result.voiceId,
      model: result.model,
      usedFallback: result.usedFallback,
      timing: result.timing,
      aiGenerated: true,
      textStyleVersion: style.textStyleVersion,
      speechStyleVersion: style.speechStyleVersion,
      questionBudget: style.maxQuestions,
      styleDecision: 'allow',
    }, 200, cors);
  } catch (error) {
    console.error('[voice-entry:synthesis]', {
      actorId,
      provider: route.provider,
      fallbackProvider: route.fallbackProvider,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return json({
      error: 'voice synthesis unavailable',
      characterId: route.canonicalCharacterId,
      voiceProvider: route.provider,
      fallbackProvider: route.fallbackProvider,
      usedFallback: Boolean(route.fallbackProvider),
    }, 502, cors);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const started = Date.now();
    const cors = corsHeaders(request, env);
    const blocked = originRejected(request, env, cors);
    if (blocked) return blocked;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') {
      const response = await observedWorker.fetch(request, env as never, ctx);
      if (!response.ok) return response;
      try {
        const data = await response.clone().json() as Record<string, unknown>;
        return json({
          ...data,
          releaseSha: WORKER_RELEASE_SHA,
          version: workerVersionEvidence(env),
        }, response.status, cors);
      } catch (error) {
        console.error('[voice-entry:health]', {
          error: error instanceof Error ? error.message : 'invalid delegated health response',
        });
        return json({
          ok: false,
          worker: 'sekret-backend',
          router: 'voice-entry',
          error: 'invalid delegated health response',
          releaseSha: WORKER_RELEASE_SHA,
          version: workerVersionEvidence(env),
        }, 502, cors);
      }
    }

    const isProtectedApiPost = request.method === 'POST' && path.includes('/api/');
    let downstreamEnv = env;

    if (isProtectedApiPost) {
      const auth = await authenticate(request, env);
      if (!auth.ok) {
        const denied = json({ error: auth.error }, auth.status, cors);
        return observeFrontDoorDenial(request, denied, env, ctx, started, 'worker_auth_failure');
      }

      const appCheckMode = firebaseAppCheckMode(env);
      if (appCheckMode !== 'off') {
        const appCheck = await verifyFirebaseAppCheck(request, env);
        observeAppCheck(request, appCheck, appCheckMode, started);
        if (
          appCheckMode === 'invalid'
          || (appCheckMode === 'enforce' && appCheck.status !== 'valid')
        ) {
          return appCheckDenied(appCheck, cors);
        }
      }

      const limited = await enforceRateLimit(request, env, auth.principal, cors);
      if (limited) {
        return observeFrontDoorDenial(request, limited, env, ctx, started, 'worker_rate_limit');
      }

      downstreamEnv = withoutRateLimiter(env);
    }

    if (request.method === 'POST' && path.endsWith('/api/sekret/voice')) {
      return handleVoice(request, downstreamEnv, cors);
    }

    const response = await observedWorker.fetch(request, downstreamEnv as never, ctx);
    return withSecurityHeaders(response, cors);
  },

  async email(message: Parameters<typeof emailRouter.email>[0]): Promise<void> {
    await emailRouter.email(message);
  },
};