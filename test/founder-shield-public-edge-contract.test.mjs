import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../.github/workflows/founder-shield.yml', import.meta.url),
  'utf8',
);
const workflowLines = new Set(workflow.split(/\r?\n/u).map((line) => line.trim()));

test('Founder Shield proves the public edge anonymously and binds the release marker to exact main', () => {
  assert.ok(workflow.includes('name: Verify anonymous live edge on main'));
  assert.equal(workflowLines.has('https://sekretbip.net/)"'), true);
  assert.equal(
    workflowLines.has('"https://sekretbip.net/.well-known/sekret-release.json?founder_shield=$EXPECTED_HEAD_SHA&attempt=$release_attempt")"; then'),
    true,
  );
  assert.equal(workflowLines.has('https://api.sekretbip.net/)"'), true);
  assert.equal(workflowLines.has('https://api.sekretbip.net/api/sekret/reply)"'), true);

  assert.ok(workflow.includes('release?.[key] !== value'));
  assert.ok(workflow.includes('commitSha: expected'));
  assert.ok(workflow.includes("branch: 'main'"));
  assert.ok(workflow.includes("deploymentProvider: 'cloudflare-pages'"));
  assert.ok(workflow.includes("canonicalUrl: 'https://sekretbip.net'"));

  assert.ok(workflow.includes('for release_attempt in $(seq 1 16); do'));
  assert.ok(workflow.includes('--max-time 5'));
  assert.ok(workflow.includes(': > "$release_headers"'));
  assert.ok(workflow.includes(': > "$release_body"'));
  assert.ok(workflow.includes('if release_result="$(curl'));
  assert.ok(workflow.includes('release_status="000"'));
  assert.ok(workflow.includes('release marker transport failure attempt=%s; retrying within bounded convergence window'));
  assert.ok(workflow.includes('observed_release_sha='));
  assert.ok(workflow.includes('"$observed_release_sha" == "${EXPECTED_HEAD_SHA,,}"'));
  assert.ok(workflow.includes('release marker pending attempt=%s status=%s observed=%s expected=%s'));
  assert.ok(workflow.includes('release marker converged attempt=%s sha=%s'));
  assert.ok(workflow.includes('sleep 6'));

  assert.ok(workflow.includes("host === 'cloudflareaccess.com'"));
  assert.ok(workflow.includes("host.endsWith('.cloudflareaccess.com')"));
  assert.ok(workflow.includes("path.startsWith('/cdn-cgi/access/')"));
  assert.ok(workflow.includes("assertPublicUrl(pagesUrl, 'sekretbip.net'"));
  assert.ok(workflow.includes("assertPublicUrl(releaseUrl, 'sekretbip.net'"));
  assert.ok(workflow.includes("assertPublicUrl(apiUrl, 'api.sekretbip.net'"));
  assert.ok(workflow.includes("assertPublicUrl(optionsUrl, 'api.sekretbip.net'"));

  assert.equal(workflow.includes('CLOUDFLARE_ACCESS_CLIENT_ID'), false);
  assert.equal(workflow.includes('CLOUDFLARE_ACCESS_CLIENT_SECRET'), false);
  assert.equal(workflow.toLowerCase().includes('cf-access-client-id:'), false);
  assert.equal(workflow.toLowerCase().includes('cf-access-client-secret:'), false);
  assert.equal(workflow.includes('access_headers='), false);

  assert.ok(workflow.includes('sanitize_headers()'));
  assert.ok(workflow.includes('release_json="$(cat "$release_body")"'));
  assert.doesNotMatch(workflow, /require\(['"]node:fs['"]\)/);
  assert.doesNotMatch(workflow, /fs\.(?:readFileSync|writeFileSync|copyFileSync)/);
});
