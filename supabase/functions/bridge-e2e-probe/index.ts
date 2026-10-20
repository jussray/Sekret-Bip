const RETIREMENT = Object.freeze({
  error: 'function_retired',
  function: 'bridge-e2e-probe',
  replacement: 'Issue #270 controlled two-account proof and repository Playwright guardrails',
  documentation: 'docs/security/SUPABASE_AUTHORIZATION_PHASE0.md',
});

Deno.serve(() => new Response(JSON.stringify(RETIREMENT), {
  status: 410,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  },
}));
