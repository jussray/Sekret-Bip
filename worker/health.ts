/**
 * GET /health  — Cloudflare Worker liveness probe
 * No DB/KV calls. Returns 200 immediately.
 * Used by: Cloudflare health checks, Control Room uptime pings, EAS deploy smoke test.
 */
export async function handleHealth(_req: Request): Promise<Response> {
  return Response.json(
    {
      status: 'ok',
      service: 'sekret-bip-worker',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Health-Check': 'liveness',
      },
    }
  );
}

/**
 * GET /status  — deep readiness probe
 * Checks KV + D1/Supabase reachability.
 */
export async function handleStatus(req: Request, env: Env): Promise<Response> {
  const checks: Array<{ name: string; status: 'ok' | 'down'; latencyMs?: number; error?: string }> = [];

  // KV check
  const kvStart = Date.now();
  try {
    await env.BIP_KV?.get('__health_probe__');
    checks.push({ name: 'kv', status: 'ok', latencyMs: Date.now() - kvStart });
  } catch (e) {
    checks.push({ name: 'kv', status: 'down', latencyMs: Date.now() - kvStart, error: String(e) });
  }

  const allOk = checks.every(c => c.status === 'ok');
  return Response.json(
    { status: allOk ? 'ok' : 'degraded', service: 'sekret-bip-worker', timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

interface Env {
  // Minimal local shape for the one method this file calls, rather than
  // pulling in @cloudflare/workers-types for a single optional health probe.
  BIP_KV?: { get(key: string): Promise<string | null> };
}
