import voiceWorker from './voice-entry';
import { bipProviderStates, invokeBipProvider, type BipProviderEnv } from './provider-runtime';

type Env = Parameters<typeof voiceWorker.fetch>[1] & BipProviderEnv & {
  BIP_AI_OPERATOR_KEY?: string;
};

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    },
  });
}

function operatorAuthorized(request: Request, env: Env): boolean {
  if (!env.BIP_AI_OPERATOR_KEY) return false;
  const direct = request.headers.get('x-bip-ai-key');
  const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return (direct || bearer || '') === env.BIP_AI_OPERATOR_KEY;
}

export default {
  async fetch(request: Request, env: Env, ctx: MinimalExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/internal/providers' && request.method === 'GET') {
      if (!env.BIP_AI_OPERATOR_KEY) return json({error: 'AI operator lane is not configured'}, 503);
      if (!operatorAuthorized(request, env)) return json({error: 'Unauthorized'}, 401);
      return json({
        service: 'sekret-bip',
        providers: bipProviderStates(env),
        authority: 'none',
        userContentForwarding: false,
      });
    }

    if (url.pathname === '/api/internal/providers/invoke' && request.method === 'POST') {
      if (!env.BIP_AI_OPERATOR_KEY) return json({error: 'AI operator lane is not configured'}, 503);
      if (!operatorAuthorized(request, env)) return json({error: 'Unauthorized'}, 401);
      const input = await request.json().catch(() => ({}));
      try {
        const result = await invokeBipProvider(env, input as Record<string, unknown>);
        return json({service: 'sekret-bip', result});
      } catch (error) {
        return json({error: error instanceof Error ? error.message : 'provider_invocation_failed'}, 503);
      }
    }

    return voiceWorker.fetch(request, env, ctx);
  },

  email(message: Parameters<typeof voiceWorker.email>[0], env: Env): Promise<void> {
    return voiceWorker.email(message, env);
  },
};
