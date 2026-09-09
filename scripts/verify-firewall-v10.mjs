import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync('security/firewall-v10.policy.json', 'utf8'));
const wrangler = readFileSync('wrangler.toml', 'utf8');
const auth = readFileSync('worker/auth.ts', 'utf8');
const entry = readFileSync('worker/voice-entry.ts', 'utf8');
const pagesHeaders = readFileSync('public/_headers', 'utf8');
const failures = [];

function require(condition, message) {
  if (!condition) failures.push(message);
}

function exactStringSet(value) {
  return new Set(Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
}

const primaryHosts = exactStringSet(policy.cloudflare?.primaryHosts);
const productionDefaultOrigins = exactStringSet(policy.controls?.cors?.productionDefaultOrigins);

require(policy.version === '10', 'policy version must be 10');
require(policy.repository === 'jussray/Sekret-Bip', 'policy must target jussray/Sekret-Bip');
require(policy.activationStage === 'policy-ci-only', 'production activation must remain CI-only until live evidence is reviewed');
require(policy.claims?.productionProtectionStatus === 'not-verified', 'production protection must not be claimed before live Cloudflare proof');
require(primaryHosts.has('sekretbip.net'), 'policy must include exact host sekretbip.net');
require(primaryHosts.has('api.sekretbip.net'), 'policy must include exact host api.sekretbip.net');
require(policy.cloudflare?.activeWorker === 'sekret-backend', 'active Worker must be sekret-backend');
require(policy.cloudflare?.edgeControls?.managedWaf?.enforcementStatus === 'live-not-verified', 'Managed WAF must remain live-not-verified until platform evidence exists');
require(policy.cloudflare?.edgeControls?.apiShield?.enforcementStatus === 'live-not-verified', 'API Shield must remain live-not-verified until platform evidence exists');
require(policy.cloudflare?.edgeControls?.authenticatedOriginPulls?.enforcementStatus === 'live-not-verified', 'Authenticated Origin Pulls must remain live-not-verified until platform evidence exists');

require(policy.controls?.auth?.implementationStatus === 'repo-verified', 'auth implementation must be repo-verified');
require(policy.controls?.auth?.liveConfigurationStatus === 'not-verified', 'live auth configuration must remain not-verified until runtime proof');
require(policy.controls?.auth?.failClosed === true, 'auth must fail closed');
require(policy.controls?.auth?.tokenlessProductionAccess === 'forbidden', 'token-less production access must be forbidden');
require(policy.controls?.rateLimiting?.implementationStatus === 'repo-verified', 'rate-limit implementation must be repo-verified');
require(policy.controls?.rateLimiting?.liveBindingStatus === 'not-verified', 'live rate-limit binding must remain not-verified until runtime proof');
require(policy.controls?.rateLimiting?.failureMode === 'fail-closed-retryable', 'rate-limit errors must fail closed with a recovery path');
require(policy.controls?.botDefense?.enforcementStatus === 'live-not-verified', 'bot defense must not be claimed enabled without platform proof');
require(policy.controls?.cors?.implementationStatus === 'repo-verified', 'CORS hardening must be repo-verified');
require(policy.controls?.cors?.liveEnforcementStatus === 'not-verified', 'live CORS enforcement must remain not-verified until deployment proof');
require(productionDefaultOrigins.has('https://sekretbip.net'), 'canonical production origin must be an exact allowed origin');
require(policy.controls?.cors?.wildcardOnlyInExplicitDevOpen === true, 'wildcard CORS must be limited to explicit dev-open');
require(policy.controls?.headers?.implementationStatus === 'repo-verified', 'security header manifests must be repo-verified');
require(policy.controls?.headers?.liveEnforcementStatus === 'not-verified', 'security headers must remain live-not-verified until response proof exists');
require(policy.controls?.headers?.liveVerificationRequired === true, 'security headers require live verification');
require(policy.controls?.productDesign?.legitimateUsersGetRecoveryPath === true, 'blocked users need a recovery path');
require(policy.controls?.productDesign?.noMisleadingConnectedOrProtectedClaims === true, 'security UI must not overclaim protection');

const requiredGates = new Set(policy.activationGates?.required ?? []);
for (const gate of [
  'repository-truth-green',
  'founder-shield-green',
  'product-design-playwright-green',
  'cloudflare-live-config-verified',
  'cloudflare-security-events-reviewed',
  'guest-and-signed-in-production-smoke-green',
]) {
  require(requiredGates.has(gate), `activation gate missing: ${gate}`);
}
require(policy.activationGates?.automaticBlockMode === false, 'production block mode must not auto-enable');

const expectedRoutes = new Set([
  '/api/sekret/reply',
  '/api/sekret/voice',
  '/api/sekret/transcribe',
  '/api/bridge/summary/generate',
]);
const routes = policy.controls?.rateLimiting?.routes ?? [];
require(routes.length === expectedRoutes.size, 'rate-limit policy must list exactly the repo-proven protected routes');
for (const route of routes) {
  require(expectedRoutes.has(route.match), `unexpected or guessed rate-limit route: ${route.match}`);
  require(Number.isInteger(route.limit) && route.limit > 0, `invalid limit for ${route.match}`);
  require(Number.isInteger(route.periodSeconds) && route.periodSeconds > 0, `invalid period for ${route.match}`);
}

require(/name = "sekret-backend"/.test(wrangler), 'wrangler Worker name must match policy');
require(/main = "worker\/voice-entry\.ts"/.test(wrangler), 'voice-entry.ts must remain the authoritative Worker front door');
require(/\[\[ratelimits\]\][\s\S]*name = "SEKRET_RATE_LIMITER"[\s\S]*namespace_id = "1001"[\s\S]*simple = \{ limit = 60, period = 10 \}/.test(wrangler), 'Cloudflare rate-limit binding must use first-class Wrangler ratelimits syntax');
require(!/\[\[unsafe\.bindings\]\][\s\S]*type = "ratelimit"/.test(wrangler), 'legacy unsafe ratelimit binding syntax must not return');
require(/^workers_dev = false$/m.test(wrangler), 'production Worker must not expose a workers.dev hostname');
require(!/^\s*route\s*=/m.test(wrangler), 'provider-managed api.sekretbip.net ownership must not be replaced by a single repo-managed route');
require(!/^\s*routes\s*=/m.test(wrangler), 'provider-managed api.sekretbip.net ownership must not be replaced by repo-managed routes');
require(!/^\s*\[\[routes\]\]\s*$/m.test(wrangler), 'provider-managed api.sekretbip.net ownership must not be replaced by Wrangler route blocks');

require(/SEKRET_AUTH_MODE\?: 'required' \| 'dev-open'/.test(auth), 'auth mode contract is missing');
require(/const devOpen = env\.SEKRET_AUTH_MODE === 'dev-open'/.test(auth), 'dev-open must be explicit');
require(!/if \(!enforced\) return \{ ok: true/.test(auth), 'legacy implicit auth fail-open returned');
require(/status: 503, error: 'authentication unavailable'/.test(auth), 'auth misconfiguration must fail closed');

require(/const DEFAULT_ALLOWED_ORIGINS = \[[\s\S]*'https:\/\/sekretbip\.net'[\s\S]*'https:\/\/www\.sekretbip\.net'/.test(entry), 'canonical production CORS origins must be encoded exactly');
require(/env\.SEKRET_AUTH_MODE === 'dev-open' \? null : DEFAULT_ALLOWED_ORIGINS/.test(entry), 'wildcard CORS must require dev-open');
require(/const blocked = originRejected\(request, env, cors\);[\s\S]*if \(blocked\) return blocked;[\s\S]*if \(request\.method === 'OPTIONS'\)/.test(entry), 'disallowed preflight origins must be rejected before 204');
require(/const isProtectedApiPost = request\.method === 'POST' && path\.includes\('\/api\/'\)/.test(entry), 'front door must identify every POST API request');
require(/await authenticate\(request, env\)/.test(entry), 'front door must authenticate protected API requests');
require(/request protection temporarily unavailable/.test(entry), 'limiter outage must expose a recoverable blocked state');
require(/'Retry-After': '30'/.test(entry), 'limiter outage must provide retry guidance');
require(!/if \(!env\.SEKRET_RATE_LIMITER\) return null;/.test(entry), 'missing rate-limit binding must not silently bypass production protection');
require(/if \(!env\.SEKRET_RATE_LIMITER\) \{[\s\S]*SEKRET_AUTH_MODE === 'dev-open'[\s\S]*return protectionUnavailable\(cors\)/.test(entry), 'missing rate-limit binding must fail closed outside explicit dev-open');
require(/SEKRET_RATE_LIMITER binding unavailable/.test(entry), 'missing rate-limit binding must emit telemetry');
require(/SEKRET_RATE_LIMITER: undefined/.test(entry), 'delegated request must not be rate-limited twice');
require(/'Strict-Transport-Security': 'max-age=31536000'/.test(entry), 'API front door must emit HSTS');
require(/'X-Frame-Options': 'DENY'/.test(entry), 'API front door must deny framing');
require(/frame-ancestors 'none'/.test(entry), 'API CSP must deny framing');
require(/withSecurityHeaders\(response, cors\)/.test(entry), 'delegated API responses must receive security headers');

require(/Strict-Transport-Security: max-age=31536000/.test(pagesHeaders), 'Pages header manifest must emit HSTS');
require(/X-Content-Type-Options: nosniff/.test(pagesHeaders), 'Pages header manifest must prevent MIME sniffing');
require(/X-Frame-Options: DENY/.test(pagesHeaders), 'Pages header manifest must deny framing');
require(/Referrer-Policy: strict-origin-when-cross-origin/.test(pagesHeaders), 'Pages header manifest must set referrer policy');
require(/Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'/.test(pagesHeaders), 'Pages CSP must provide narrow nonbreaking frame/base/object protection');

if (failures.length) {
  console.error('Founder Shield verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Founder Shield verified: repo controls are enforced; provider-managed custom-domain ownership and live Cloudflare controls remain separate proof authorities.');