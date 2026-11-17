/**
 * Frontend-host passthrough contract.
 *
 * The public family front door (`app.sekretbip.net` and the apex/www hosts) is
 * owned by Cloudflare Pages project `sekret-bip`. The backend Workers built from
 * `worker/voice-entry.ts` (`sekret-backend`, and the separately named `bip`)
 * serve only `/api/*` and `/health`.
 *
 * A Worker route that matches a frontend host (for example an exact
 * `app.sekretbip.net/` route) runs before Pages. Without this guard the backend
 * answers a stranger's page load with `405 {"error":"Method not allowed"}`
 * instead of the welcome UI. Returning `fetch(request)` from a Worker route
 * hands the request to the zone origin (Pages) without re-entering the Worker.
 *
 * This never widens the backend: API paths on frontend hosts, every request to
 * other hosts, and every non-read method keep their existing behavior.
 */
export const FRONTEND_HOSTS = Object.freeze([
  'app.sekretbip.net',
  'sekretbip.net',
  'www.sekretbip.net',
]);

const READ_METHODS = new Set(['GET', 'HEAD']);

/**
 * @param {string} method
 * @param {string | URL} url
 * @returns {boolean}
 */
export function shouldPassThroughToFrontend(method, url) {
  if (!READ_METHODS.has(String(method).toUpperCase())) return false;
  let parsed;
  try {
    parsed = url instanceof URL ? url : new URL(url);
  } catch {
    return false;
  }
  if (!FRONTEND_HOSTS.includes(parsed.hostname.toLowerCase())) return false;
  const path = parsed.pathname;
  return path !== '/api' && !path.startsWith('/api/');
}
