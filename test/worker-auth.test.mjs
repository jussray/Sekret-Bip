/**
 * Worker auth + rate limiting contracts.
 *
 * These source-level checks protect the shipping Cloudflare entrypoint from
 * regressing to token-less production access or fail-open limiter behavior.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth = fs.readFileSync(new URL('../worker/auth.ts', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8');
const voiceEntry = fs.readFileSync(new URL('../worker/voice-entry.ts', import.meta.url), 'utf8');

const bearerLine = auth.split('\n').find((line) => line.includes('Bearer') && line.includes('exec'));
assert.ok(bearerLine, 'extractBearer must use a Bearer regex');
const rawRegex = bearerLine.replace(/^.*=\s*/, '').replace(/\.exec.*$/, '').trim();
const BEARER_RE = new Function(`return ${rawRegex}`)();

test('Bearer regex extracts the token, case-insensitive, trims whitespace', () => {
  assert.equal(BEARER_RE.exec('Bearer abc123')?.[1].trim(), 'abc123');
  assert.equal(BEARER_RE.exec('bearer xyz')?.[1].trim(), 'xyz');
  assert.equal(BEARER_RE.exec('Bearer   spaced  ')?.[1].trim(), 'spaced');
  assert.equal(BEARER_RE.exec('Basic abc123'), null);
  assert.equal(BEARER_RE.exec(''), null);
});

test('timingSafeEqual matches equal strings and rejects mismatches', () => {
  const start = auth.indexOf('export function timingSafeEqual');
  const slice = auth.slice(start, auth.indexOf('\n}', start) + 2);
  const body = slice.replace(/export function timingSafeEqual\([^)]*\)\s*:\s*boolean\s*/, '');
  const timingSafeEqual = new Function('a', 'b', body.replace(/^\{/, '').replace(/\}$/, ''));
  assert.equal(timingSafeEqual('secret-token', 'secret-token'), true);
  assert.equal(timingSafeEqual('secret-token', 'secret-tokeX'), false);
  assert.equal(timingSafeEqual('short', 'longer-value'), false);
  assert.ok(/mismatch \|=|\^=/.test(slice), 'must XOR-accumulate, not early-return per char');
});

test('looksLikeJwt matches three base64url segments only', () => {
  const jwtLine = auth.split('\n').find((line) => line.includes('.test(token)') && line.includes('return'));
  assert.ok(jwtLine, 'looksLikeJwt must test a JWT-shaped regex');
  const raw = jwtLine.replace(/^.*return\s*/, '').replace(/\.test\(token\).*$/, '').trim();
  const JWT_RE = new Function(`return ${raw}`)();
  assert.equal(JWT_RE.test('aaa.bbb.ccc'), true);
  assert.equal(JWT_RE.test('eyJhbGciOi.eyJzdWIiOi.sIg-nature_1'), true);
  assert.equal(JWT_RE.test('shared-client-token'), false);
  assert.equal(JWT_RE.test('aaa.bbb'), false);
  assert.equal(JWT_RE.test('aaa.bbb.ccc.ddd'), false);
});

test('authentication is fail-closed by default with explicit dev-open only', () => {
  assert.ok(/SEKRET_AUTH_MODE\?: 'required' \| 'dev-open'/.test(auth), 'auth mode must be explicit');
  assert.ok(/const devOpen = env\.SEKRET_AUTH_MODE === 'dev-open'/.test(auth), 'dev-open is opt-in');
  assert.ok(/if \(!token && devOpen\)/.test(auth), 'only a missing token may use dev-open');
  assert.doesNotMatch(auth, /if \(!enforced\) return \{ ok: true/, 'legacy implicit fail-open must not return');
  assert.ok(/status: 503, error: 'authentication unavailable'/.test(auth), 'misconfigured auth fails closed');
});

test('auth returns 401 missing, 403 invalid, and 503 unavailable', () => {
  assert.ok(/status: 401, error: 'missing bearer token'/.test(auth), '401 on missing credential');
  assert.ok(/status: 403, error: 'invalid token'/.test(auth), '403 on invalid credential');
  assert.ok(/status: 503, error: 'authentication unavailable'/.test(auth), '503 on server auth misconfiguration');
});

test('shared guest token requires an exact constant-time match', () => {
  assert.ok(/sharedToken && timingSafeEqual\(token, sharedToken\)/.test(auth), 'shared token must be exact');
  assert.ok(/principal: \{ kind: 'shared-token' \}/.test(auth), 'shared-token principal remains supported');
});

test('verifies Supabase JWTs via jose against issuer + audience', () => {
  assert.ok(/from 'jose'/.test(auth), 'uses the jose library');
  assert.ok(/createRemoteJWKSet\(new URL\(jwksUrl\)\)/.test(auth), 'builds a remote JWKS set');
  assert.ok(/auth\/v1\/\.well-known\/jwks\.json/.test(auth), 'derives the Supabase JWKS URL');
  assert.ok(/issuer: `\$\{supabaseUrl\}\/auth\/v1`/.test(auth), 'pins the expected issuer');
  assert.ok(/audience: 'authenticated'/.test(auth), 'pins the expected audience');
});

test('a valid JWT yields a per-user principal; invalid JWT always rejects', () => {
  assert.ok(/payload\?\.sub\) return \{ ok: true, principal: \{ kind: 'user', userId: payload\.sub \} \}/.test(auth),
    'verified JWT maps sub to user principal');
  assert.ok(/await jwtVerify\(/.test(auth), 'delegates crypto verification to jose');
  assert.ok(/} catch \{\s*return null;/.test(auth), 'unverifiable JWT resolves to null');
  assert.ok(/if \(token && hasJwtVerifier && looksLikeJwt\(token\)\)[\s\S]*status: 403, error: 'invalid token'/.test(auth),
    'invalid JWT cannot fall through to an authenticated guest principal');
});

test('Principal type carries user identity for rate-limit keying', () => {
  assert.ok(/kind: 'user'; userId: string/.test(auth), 'user principal present');
});

test('legacy index still authenticates POST /api/* before handling', () => {
  assert.ok(/path\.includes\('\/api\/'\)/.test(index), 'gates /api/ POST routes');
  assert.ok(/await authenticate\(request, env\)/.test(index), 'awaits authenticate');
  assert.ok(/if \(!auth\.ok\) return json\(\{ error: auth\.error \}, auth\.status/.test(index), 'rejects failed auth');
});

test('authoritative voice-entry front door authenticates and rate-limits every POST API request', () => {
  const protectedAt = voiceEntry.indexOf("const isProtectedApiPost = request.method === 'POST' && path.includes('/api/');");
  const authAt = voiceEntry.indexOf('const auth = await authenticate(request, env);');
  const limitAt = voiceEntry.indexOf('const limited = await enforceRateLimit(request, env, auth.principal, cors);');
  const delegateAt = voiceEntry.indexOf('const response = await observedWorker.fetch(request, downstreamEnv as never, ctx);');
  assert.ok(protectedAt > 0, 'front door identifies protected API POSTs');
  assert.ok(authAt > protectedAt && authAt < delegateAt, 'auth runs before delegation');
  assert.ok(limitAt > authAt && limitAt < delegateAt, 'rate limit runs before delegation');
});

test('front-door limiter fails closed and avoids downstream double counting', () => {
  assert.ok(/request protection temporarily unavailable/.test(voiceEntry), 'limiter outage has a recoverable message');
  assert.ok(/503/.test(voiceEntry), 'limiter outage returns service unavailable');
  assert.ok(/'Retry-After': '30'/.test(voiceEntry), 'limiter outage exposes retry guidance');
  assert.ok(/SEKRET_RATE_LIMITER: undefined/.test(voiceEntry), 'downstream copy cannot double-count the request');
  assert.ok(/rate limit exceeded', retryable: true \}, 429/.test(voiceEntry), 'over-limit requests return 429');
  assert.doesNotMatch(voiceEntry, /if \(!env\.SEKRET_RATE_LIMITER\) return null;/, 'missing production binding must never silently bypass protection');
  assert.ok(/if \(!env\.SEKRET_RATE_LIMITER\) \{[\s\S]*SEKRET_AUTH_MODE === 'dev-open'[\s\S]*return protectionUnavailable\(cors\)/.test(voiceEntry),
    'missing binding must fail closed outside explicit dev-open');
  assert.ok(/SEKRET_RATE_LIMITER binding unavailable/.test(voiceEntry), 'missing binding must emit telemetry');
  assert.ok(/function protectionUnavailable\([\s\S]*request protection temporarily unavailable[\s\S]*'Retry-After': '30'/.test(voiceEntry),
    'missing and throwing limiter failures must share the retryable 503 response');
});

test('CORS allows Authorization and remains origin-configurable', () => {
  assert.ok(/'Access-Control-Allow-Headers': 'Content-Type, Authorization'/.test(index));
  assert.ok(/env\.ALLOWED_ORIGINS/.test(index));
  assert.ok(/OPTIONS'\) return new Response\(null, \{ status: 204, headers: cors \}\)/.test(index));
});

test('legacy index defaults CORS to canonical origins outside explicit dev-open', () => {
  assert.ok(index.includes('const DEFAULT_ALLOWED_ORIGINS = ['),
    'standalone router must define canonical production defaults');
  assert.ok(index.includes("'https://sekretbip.net'"));
  assert.ok(index.includes("'https://www.sekretbip.net'"));
  assert.ok(index.includes("'https://app.sekretbip.net'"));
  assert.ok(index.includes("env.SEKRET_AUTH_MODE === 'dev-open' ? null : DEFAULT_ALLOWED_ORIGINS"),
    'wildcard CORS is reserved for explicit dev-open');
  assert.equal(index.includes("if (!configured || configured === '*') return null;"), false,
    'unset production origins must not silently become wildcard');
});

test('disallowed origins are rejected before auth/delegation', () => {
  const rejectAt = index.indexOf('const blocked = originRejected(');
  const authAt = index.indexOf('await authenticate(request, env)');
  const delegateAt = index.indexOf('await worker.fetch(request');
  assert.ok(rejectAt > 0);
  assert.ok(rejectAt < authAt);
  assert.ok(rejectAt < delegateAt);
  assert.ok(/origin not allowed' \}, 403/.test(index));
  assert.ok(/if \(!origin \|\| allowed\.includes\(origin\)\) return null/.test(index));
});

test("fallback delegation carries this Worker's CORS headers, not the delegate's wildcard", () => {
  // sekret-reply.ts sets 'Access-Control-Allow-Origin': '*' on every response it
  // builds. The generic fallback path returns that response, so it must be
  // re-wrapped with the origin-locked headers computed here or CORS reopens to '*'.
  assert.ok(/function withCors\(response: Response, cors: Record<string, string>\): Response \{/.test(index),
    'a dedicated header-merge helper wraps the delegated response');
  assert.ok(/const fallback = await worker\.fetch\(request, env as \{ OPENAI_API_KEY: string \}, principal\);\s*\n\s*return withCors\(fallback, cors\);/.test(index),
    'the generic fallback path applies withCors before returning');
});

test('authoritative CORS defaults production to canonical origins and reserves wildcard for dev-open', () => {
  assert.ok(/const DEFAULT_ALLOWED_ORIGINS = \[[\s\S]*https:\/\/sekretbip\.net[\s\S]*https:\/\/www\.sekretbip\.net[\s\S]*https:\/\/app\.sekretbip\.net/.test(voiceEntry),
    'production defaults must include the canonical Pages app origin');
  assert.ok(/env\.SEKRET_AUTH_MODE === 'dev-open' \? null : DEFAULT_ALLOWED_ORIGINS/.test(voiceEntry));
  assert.doesNotMatch(voiceEntry, /if \(!configured \|\| configured === '\*'\) return null/);
  const blockedAt = voiceEntry.indexOf('const blocked = originRejected(request, env, cors);');
  const optionsAt = voiceEntry.indexOf("if (request.method === 'OPTIONS') return new Response");
  assert.ok(blockedAt > 0 && blockedAt < optionsAt, 'disallowed preflight origins are rejected before 204');
});

test('authoritative API responses carry baseline transport and framing protection', () => {
  assert.ok(/'Strict-Transport-Security': 'max-age=31536000'/.test(voiceEntry));
  assert.ok(/'X-Content-Type-Options': 'nosniff'/.test(voiceEntry));
  assert.ok(/'X-Frame-Options': 'DENY'/.test(voiceEntry));
  assert.ok(/'Referrer-Policy': 'no-referrer'/.test(voiceEntry));
  assert.ok(/frame-ancestors 'none'/.test(voiceEntry));
  assert.ok(/withSecurityHeaders\(response, cors\)/.test(voiceEntry), 'delegated responses are wrapped at the authoritative front door');
});
