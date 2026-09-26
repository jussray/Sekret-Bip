import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { handleGitHubWebhook } from '../worker/github-webhook.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function signature(secret, body) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, body));
  return `sha256=${[...signed].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

test('GitHub webhook rejects missing secret and invalid signatures', async () => {
  const body = new TextEncoder().encode('{"zen":"keep it logically awesome"}');
  const missingSecret = await handleGitHubWebhook(
    new Request('https://api.sekretbip.net/webhooks/github', {
      method: 'POST',
      body,
      headers: {
        'X-GitHub-Event': 'ping',
        'X-GitHub-Delivery': 'delivery-1',
        'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64),
      },
    }),
    {},
  );
  assert.equal(missingSecret.status, 503);

  const invalid = await handleGitHubWebhook(
    new Request('https://api.sekretbip.net/webhooks/github', {
      method: 'POST',
      body,
      headers: {
        'X-GitHub-Event': 'ping',
        'X-GitHub-Delivery': 'delivery-2',
        'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64),
      },
    }),
    { GITHUB_WEBHOOK_SECRET: 'test-secret' },
  );
  assert.equal(invalid.status, 401);
});

test('GitHub ping is accepted only after HMAC verification', async () => {
  const secret = 'test-secret';
  const body = new TextEncoder().encode('{"zen":"keep it logically awesome"}');
  const response = await handleGitHubWebhook(
    new Request('https://api.sekretbip.net/webhooks/github', {
      method: 'POST',
      body,
      headers: {
        'X-GitHub-Event': 'ping',
        'X-GitHub-Delivery': 'delivery-3',
        'X-Hub-Signature-256': await signature(secret, body),
      },
    }),
    { GITHUB_WEBHOOK_SECRET: secret },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, accepted: true, event: 'ping' });
});

test('production worker keeps api.sekretbip.net and routes one public GitHub ingress path', async () => {
  const [wrangler, entry, handler] = await Promise.all([
    read('wrangler.toml'),
    read('worker/github-app-entry.ts'),
    read('worker/github-webhook.ts'),
  ]);

  assert.match(wrangler, /main = "worker\/github-app-entry\.ts"/);
  assert.match(wrangler, /api\.sekretbip\.net\/webhooks\/github/);
  assert.match(wrangler, /GITHUB_WEBHOOK_SECRET/);
  assert.match(entry, /pathname === '\/webhooks\/github'/);
  assert.match(entry, /return baseWorker\.fetch\(request, env, ctx\)/);
  assert.match(handler, /X-Hub-Signature-256/);
  assert.match(handler, /crypto\.subtle\.verify\('HMAC'/);
  assert.doesNotMatch(handler, /console\.(?:log|error|warn)\(/);
});
