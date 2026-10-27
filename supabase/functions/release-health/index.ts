const RETIREMENT = Object.freeze({
  error: 'function_retired',
  function: 'release-health',
  replacement: 'GitHub Cloudflare-native deployment verification',
  evidencePath: 'artifacts/cloudflare-native-deploy.json',
  documentation: 'DEPLOYMENT.md',
});

Deno.serve(() => new Response(JSON.stringify(RETIREMENT), {
  status: 410,
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  },
}));
