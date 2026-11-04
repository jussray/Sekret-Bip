const reportOnly = process.env.CONTROL_ROOM_REPORT_ONLY === 'true';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sha = process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA;
if (!sha) throw new Error('Release commit SHA is required.');

const releaseKey = process.env.RELEASE_KEY || `cloudflare:${sha.slice(0, 12)}`;
const release = {
  release_key: releaseKey,
  commit_sha: sha,
  branch: process.env.GITHUB_REF_NAME || 'main',
  workflow_run_id: process.env.GITHUB_RUN_ID || null,
  deployed_at: new Date().toISOString(),
  status: 'observing',
  summary: { provider: 'cloudflare' },
};

if (reportOnly || !url || !key) {
  console.log(JSON.stringify({ report_only: true, release }, null, 2));
  process.exit(0);
}

async function post(pathname, body, prefer) {
  const response = await fetch(`${url.replace(/\/$/, '')}${pathname}`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

await post('/rest/v1/control_room_releases?on_conflict=release_key', release, 'resolution=ignore-duplicates,return=representation');
const health = await post('/rest/v1/rpc/refresh_control_room_release_health', { p_release_key: releaseKey }, 'return=representation');
console.log(JSON.stringify({ release_key: releaseKey, health }, null, 2));
