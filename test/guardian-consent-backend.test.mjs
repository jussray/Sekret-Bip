import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const localTsc = path.resolve('node_modules/.bin/tsc');
const tsc = existsSync(localTsc) ? localTsc : 'tsc';
const out = mkdtempSync(path.join(tmpdir(), 'guardian-consent-'));
test.after(() => rmSync(out, { recursive: true, force: true }));

execFileSync(tsc, [
  path.resolve('worker/guardian-consent.ts'),
  '--rootDir', path.resolve('.'),
  '--outDir', out,
  '--target', 'ES2022',
  '--module', 'commonjs',
  '--skipLibCheck',
  '--strict',
], { stdio: 'inherit' });

const { resolveGuardianSharingConsent } = require(path.join(out, 'worker', 'guardian-consent.js'));
const guardianConsentSource = readFileSync('worker/guardian-consent.ts', 'utf8');

test('guardian-consent lookup is bounded and fail-closed on timeout', () => {
  assert.match(guardianConsentSource, /signal:\s*AbortSignal\.timeout\(1000\)/);
  assert.doesNotMatch(guardianConsentSource, /setTimeout\(/);
});
const KEY = 'test-service-key';
const USER = '00000000-0000-4000-8000-000000000001';
let mode = 'true';
const calls = [];

const server = createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    calls.push({
      path: req.url,
      apikey: req.headers.apikey,
      auth: req.headers.authorization,
      body: JSON.parse(raw || '{}'),
    });
    if (mode === 'error') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"boom"}');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(mode === 'true' ? 'true' : 'false');
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
test.after(() => server.close());
const url = `http://127.0.0.1:${server.address().port}`;

test('verified user id is the only value sent to the server-only RPC', async () => {
  calls.length = 0;
  const allowed = await resolveGuardianSharingConsent(
    { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: KEY },
    { kind: 'user', userId: USER },
  );
  assert.equal(allowed, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/rest/v1/rpc/guardian_summary_permitted');
  assert.equal(calls[0].apikey, KEY);
  assert.equal(calls[0].auth, `Bearer ${KEY}`);
  assert.deepEqual(calls[0].body, { p_teen_user_id: USER });
});

test('shared-token and missing configuration fail closed without a request', async () => {
  calls.length = 0;
  assert.equal(await resolveGuardianSharingConsent({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: KEY }, { kind: 'shared-token' }), false);
  assert.equal(await resolveGuardianSharingConsent({ SUPABASE_URL: url }, { kind: 'user', userId: USER }), false);
  assert.equal(calls.length, 0);
});

test('database false and transport errors fail closed', async () => {
  mode = 'false';
  assert.equal(await resolveGuardianSharingConsent({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: KEY }, { kind: 'user', userId: USER }), false);
  mode = 'error';
  assert.equal(await resolveGuardianSharingConsent({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: KEY }, { kind: 'user', userId: USER }), false);
  mode = 'true';
});
