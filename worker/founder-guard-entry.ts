import voiceEntry from './voice-entry';
import {
  evaluateFounderOperationKillSwitch,
  stableHttpOperationId,
} from '../shared/founder-operation-kill-switch.js';

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface FounderKillSwitchEnv {
  FOUNDER_OPERATION_KILL_SWITCH?: string;
  FOUNDER_OPERATION_KILL_SWITCH_REASON?: string;
  ALLOWED_ORIGINS?: string;
  SEKRET_AUTH_MODE?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://sekretbip.net',
  'https://www.sekretbip.net',
  'https://app.sekretbip.net',
];

function allowedOrigins(env: FounderKillSwitchEnv): string[] | null {
  const configured = env.ALLOWED_ORIGINS?.trim();
  if (!configured || configured === '*') {
    return env.SEKRET_AUTH_MODE === 'dev-open' ? null : DEFAULT_ALLOWED_ORIGINS;
  }
  return configured.split(',').map((value) => value.trim()).filter(Boolean);
}

function guardedOperation(request: Request): { scope: string; operation: string } | null {
  if (request.method === 'OPTIONS') return null;
  const pathname = new URL(request.url).pathname;
  if (request.method === 'GET' && pathname === '/health') return null;

  if (pathname.endsWith('/api/sekret/reply')) return { scope: 'companion', operation: 'sekret:reply' };
  if (pathname.endsWith('/api/sekret/voice')) return { scope: 'companion', operation: 'sekret:voice' };
  if (pathname.endsWith('/api/sekret/transcribe')) return { scope: 'companion', operation: 'sekret:transcribe' };
  if (pathname.endsWith('/api/bridge/summary/generate')) return { scope: 'bridge', operation: 'bridge:summary-generate' };
  if (pathname.includes('/api/')) return { scope: 'api', operation: stableHttpOperationId(request.method, pathname) };
  return { scope: 'worker', operation: stableHttpOperationId(request.method, pathname) };
}

function securityAndCorsHeaders(request: Request, env: FounderKillSwitchEnv): Record<string, string> {
  const allowed = allowedOrigins(env);
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Retry-After': '60',
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    Vary: 'Origin',
  };
  if (!allowed) headers['Access-Control-Allow-Origin'] = '*';
  else if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function pausedResponse(request: Request, env: FounderKillSwitchEnv): Response {
  return new Response(JSON.stringify({
    error: "Se'kret Bip is temporarily paused by the founder.",
    code: 'FOUNDER_OPERATION_PAUSED',
    retryable: false,
  }), {
    status: 503,
    headers: securityAndCorsHeaders(request, env),
  });
}

export default {
  async fetch(request: Request, env: FounderKillSwitchEnv, ctx: MinimalExecutionContext): Promise<Response> {
    const guarded = guardedOperation(request);
    if (guarded) {
      const decision = evaluateFounderOperationKillSwitch({
        rawValue: env.FOUNDER_OPERATION_KILL_SWITCH,
        rawReason: env.FOUNDER_OPERATION_KILL_SWITCH_REASON,
        ...guarded,
      });
      if (decision.blocked) {
        console.warn('[founder-operation-kill-switch]', {
          scope: decision.scope,
          operation: decision.operation,
          reason: decision.reason,
          invalidConfiguration: decision.invalidConfiguration,
        });
        return pausedResponse(request, env);
      }
    }
    return voiceEntry.fetch(request, env as never, ctx);
  },

  async email(
    message: Parameters<typeof voiceEntry.email>[0],
    env: FounderKillSwitchEnv,
  ): Promise<void> {
    const decision = evaluateFounderOperationKillSwitch({
      rawValue: env.FOUNDER_OPERATION_KILL_SWITCH,
      rawReason: env.FOUNDER_OPERATION_KILL_SWITCH_REASON,
      scope: 'email',
      operation: 'email:inbound',
    });
    if (decision.blocked) {
      console.warn('[founder-operation-kill-switch]', {
        scope: decision.scope,
        operation: decision.operation,
        reason: decision.reason,
        invalidConfiguration: decision.invalidConfiguration,
      });
      const rejectable = message as Parameters<typeof voiceEntry.email>[0] & { setReject?: (reason: string) => void };
      if (typeof rejectable.setReject === 'function') {
        rejectable.setReject("Se'kret Bip email processing is temporarily paused.");
        return;
      }
      throw new Error('FOUNDER_OPERATION_PAUSED');
    }
    await voiceEntry.email(message);
  },
};