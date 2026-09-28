import { bipProviderStates, invokeBipProvider, type BipProviderEnv } from './provider-runtime';

type Env = BipProviderEnv & { BIP_AI_OPERATOR_KEY?: string };

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
  });
}

function authorized(request: Request, env: Env): boolean {
  if (!env.BIP_AI_OPERATOR_KEY) return false;
  const direct = request.headers.get('x-bip-ai-key');
  const bearer = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  return (direct || bearer || '') === env.BIP_AI_OPERATOR_KEY;
}

export async function handleBipProviderRequest(
  request: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response | null> {
  const url = new URL(request.url);
  const statusPath = url.pathname === '/api/internal/providers';
  const invokePath = url.pathname === '/api/internal/providers/invoke';
  if (!statusPath && !invokePath) return null;

  if (!env.BIP_AI_OPERATOR_KEY) return json({error: 'AI operator lane is not configured'}, 503, headers);
  if (!authorized(request, env)) return json({error: 'Unauthorized'}, 401, headers);

  if (statusPath && request.method === 'GET') {
    return json({
      service: 'sekret-bip',
      providers: bipProviderStates(env),
      authority: 'none',
      userContentForwarding: false,
    }, 200, headers);
  }

  if (invokePath && request.method === 'POST') {
    const input = await request.json().catch(() => ({}));
    try {
      const result = await invokeBipProvider(env, input as Record<string, unknown>);
      return json({service: 'sekret-bip', result}, 200, headers);
    } catch (error) {
      return json({error: error instanceof Error ? error.message : 'provider_invocation_failed'}, 503, headers);
    }
  }

  return json({error: 'Method not allowed'}, 405, headers);
}
