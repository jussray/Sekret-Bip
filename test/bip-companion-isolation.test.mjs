import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const configUrl = new URL('../wrangler.bip.toml', import.meta.url);
const entryUrl = new URL('../worker/companion-entry.ts', import.meta.url);

test('dedicated bip config cannot expose a public route or platform secrets', async () => {
  const config = await readFile(configUrl, 'utf8');
  assert.match(config, /^name\s*=\s*"bip"\s*$/m);
  assert.match(config, /^main\s*=\s*"worker\/companion-entry.ts"\s*$/m);
  assert.match(config, /^workers_dev\s*=\s*false\s*$/m);
  assert.match(config, /^preview_urls\s*=\s*false\s*$/m);
  assert.doesNotMatch(config, /(^\s*\[\[?routes?\]\]?|^\s*routes?\s*=)/m);
  assert.doesNotMatch(config, /SUPABASE_SERVICE_ROLE_KEY|BIP_CLIENT_TOKEN|SEKRET_CLIENT_TOKEN|^\s*\[\[?durable_objects|^\s*\[\[?r2_buckets|^\s*\[\[?kv_namespaces/im);
  const entry = await readFile(entryUrl, 'utf8');
  assert.doesNotMatch(entry, /bridge-summary|email-router|SUPABASE_SERVICE_ROLE_KEY|secret|(?:from|import)\s*\(?\s*['"]\.\/index/i);
});

test('companion placeholder blocks use before a separately verified internal delegation', async () => {
  const mod = await import(entryUrl.href);
  assert.equal(typeof mod.default?.fetch, 'function');
  const bridge = await mod.default.fetch(new Request('https://companion.internal/api/bridge/summary/generate',{method:'POST'}), {});
  assert.equal(bridge.status, 404);
  const publicGet = await mod.default.fetch(new Request('https://companion.internal/health'), {});
  assert.equal(publicGet.status, 404);
  const reply = await mod.default.fetch(new Request('https://companion.internal/api/sekret/reply',{method:'POST'}), {});
  assert.equal(reply.status, 503);
  assert.equal((await reply.json()).code, 'BIP_COMPANION_NOT_ACTIVATED');
  assert.equal(reply.headers.get('Cache-Control'), 'no-store');
  assert.equal(reply.headers.get('Set-Cookie'), null);
});
