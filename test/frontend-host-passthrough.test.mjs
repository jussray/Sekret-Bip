import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  FRONTEND_HOSTS,
  shouldPassThroughToFrontend,
} from '../shared/frontend-host-passthrough.js';

test('page loads on public frontend hosts pass through to Pages', () => {
  for (const host of FRONTEND_HOSTS) {
    assert.equal(shouldPassThroughToFrontend('GET', `https://${host}/`), true, host);
    assert.equal(shouldPassThroughToFrontend('HEAD', `https://${host}/signup?side=teen`), true, host);
  }
  assert.equal(shouldPassThroughToFrontend('get', 'https://APP.sekretbip.net/login'), true);
});

test('API paths on frontend hosts keep backend behavior', () => {
  assert.equal(shouldPassThroughToFrontend('GET', 'https://app.sekretbip.net/api/sekret/reply'), false);
  assert.equal(shouldPassThroughToFrontend('GET', 'https://app.sekretbip.net/api'), false);
});

test('backend host, non-read methods and malformed URLs never pass through', () => {
  assert.equal(shouldPassThroughToFrontend('GET', 'https://api.sekretbip.net/'), false);
  assert.equal(shouldPassThroughToFrontend('GET', 'https://api.sekretbip.net/health'), false);
  assert.equal(shouldPassThroughToFrontend('POST', 'https://app.sekretbip.net/'), false);
  assert.equal(shouldPassThroughToFrontend('OPTIONS', 'https://app.sekretbip.net/'), false);
  assert.equal(shouldPassThroughToFrontend('GET', 'https://app.sekretbip.net.evil.example/'), false);
  assert.equal(shouldPassThroughToFrontend('GET', 'not a url'), false);
});

test('worker entry applies the passthrough before any backend handling', () => {
  const source = fs.readFileSync(new URL('../worker/voice-entry.ts', import.meta.url), 'utf8');
  const fetchStart = source.indexOf('async fetch(request: Request, env: Env');
  assert.ok(fetchStart > 0);
  const guard = source.indexOf('shouldPassThroughToFrontend(request.method, request.url)', fetchStart);
  const cors = source.indexOf('corsHeaders(request, env)', fetchStart);
  assert.ok(guard > fetchStart && guard < cors, 'passthrough must run before CORS/origin/auth handling');
});
