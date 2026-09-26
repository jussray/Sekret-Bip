export interface GitHubWebhookEnv {
  GITHUB_WEBHOOK_SECRET?: string;
}

const MAX_WEBHOOK_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();

function securityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    'Cache-Control': 'no-store',
  };
}

function json(data: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...securityHeaders(),
      ...extraHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function signatureBytes(value: string | null): Uint8Array | null {
  const match = value?.match(/^sha256=([0-9a-f]{64})$/i);
  if (!match) return null;

  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(match[1].slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function verifySignature(secret: string, body: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, signature, body);
}

export async function handleGitHubWebhook(
  request: Request,
  env: GitHubWebhookEnv,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405, { Allow: 'POST' });
  }

  const secret = env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return json({ error: 'webhook unavailable' }, 503);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_WEBHOOK_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }

  const signature = signatureBytes(request.headers.get('X-Hub-Signature-256'));
  if (!signature) {
    return json({ error: 'invalid webhook signature' }, 401);
  }

  let verified = false;
  try {
    verified = await verifySignature(secret, body, signature);
  } catch {
    return json({ error: 'webhook verification unavailable' }, 503);
  }
  if (!verified) {
    return json({ error: 'invalid webhook signature' }, 401);
  }

  const event = request.headers.get('X-GitHub-Event')?.trim();
  const delivery = request.headers.get('X-GitHub-Delivery')?.trim();
  if (!event || !delivery) {
    return json({ error: 'missing GitHub delivery metadata' }, 400);
  }

  // Ingress is intentionally metadata-only for now. The verified payload is
  // not logged or persisted here; event-specific handlers can be added behind
  // this signature boundary without creating a second public webhook route.
  return json(
    { ok: true, accepted: true, event },
    event === 'ping' ? 200 : 202,
  );
}
