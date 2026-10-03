type RpcError = { message?: string } | null;

type RpcResult = {
  data: unknown;
  error: RpcError;
};

type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
};

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function parseDecision(data: unknown): RateLimitDecision | null {
  if (!data || typeof data !== 'object') return null;
  const value = data as Record<string, unknown>;
  if (typeof value.allowed !== 'boolean') return null;
  const retry = Number(value.retry_after_seconds ?? 0);
  if (!Number.isFinite(retry) || retry < 0) return null;
  return {
    allowed: value.allowed,
    retryAfterSeconds: Math.max(0, Math.ceil(retry)),
  };
}

function blockedResponse(
  status: 429 | 503,
  error: 'rate_limit_exceeded' | 'rate_limit_unavailable',
  retryAfterSeconds: number,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': String(Math.max(1, retryAfterSeconds)),
      ...extraHeaders,
    },
  });
}

async function enforce(
  client: RpcClient,
  rpcName: 'consume_edge_function_rate_limit' | 'consume_server_edge_function_rate_limit',
  functionName: string,
  extraHeaders: HeadersInit,
): Promise<Response | null> {
  const { data, error } = await client.rpc(rpcName, { p_function: functionName });
  if (error) {
    console.error(`[${functionName}] rate limiter failed`, error.message ?? 'rpc_error');
    return blockedResponse(503, 'rate_limit_unavailable', 60, extraHeaders);
  }

  const decision = parseDecision(data);
  if (!decision) {
    console.error(`[${functionName}] rate limiter returned an invalid decision`);
    return blockedResponse(503, 'rate_limit_unavailable', 60, extraHeaders);
  }

  if (!decision.allowed) {
    return blockedResponse(
      429,
      'rate_limit_exceeded',
      decision.retryAfterSeconds || 60,
      extraHeaders,
    );
  }

  return null;
}

export function enforceAuthenticatedEdgeRateLimit(
  client: RpcClient,
  functionName: string,
  extraHeaders: HeadersInit = {},
): Promise<Response | null> {
  return enforce(
    client,
    'consume_edge_function_rate_limit',
    functionName,
    extraHeaders,
  );
}

export function enforceServerEdgeRateLimit(
  client: RpcClient,
  functionName: string,
  extraHeaders: HeadersInit = {},
): Promise<Response | null> {
  return enforce(
    client,
    'consume_server_edge_function_rate_limit',
    functionName,
    extraHeaders,
  );
}
