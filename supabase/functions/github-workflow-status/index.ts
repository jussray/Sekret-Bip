const RETIREMENT = Object.freeze({
  error: 'function_retired',
  function: 'github-workflow-status',
  replacement: 'GitHub Actions checks and Cloudflare-native deployment evidence',
  documentation: 'DEPLOYMENT.md',
});

Deno.serve(() => new Response(JSON.stringify(RETIREMENT), {
  status: 410,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  },
}));
