/**
 * Closed-by-default companion entry. This Worker has no public routing,
 * backend platform imports, or privileged database access.
 * It is intentionally nonfunctional until protected internal delegation,
 * companion auth, voice and safety behaviors pass the release gate.
 */
const companionPaths = new Set([
  '/api/sekret/reply',
  '/api/sekret/voice',
  '/api/sekret/transcribe',
]);

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
};

export default {
  fetch(request: Request): Response {
    const pathname = new URL(request.url).pathname;
    if (request.method !== 'POST' || !companionPaths.has(pathname)) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    }
    return new Response(JSON.stringify({
      error: 'Companion runtime is not activated.',
      code: 'BIP_COMPANION_NOT_ACTIVATED',
      retryable: false,
    }), { status: 503, headers });
  },
};
