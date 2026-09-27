import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyEndpointProbe,
  collectProductionReleaseEndpointEvidence,
  probeJsonEndpoint,
  sanitizeObservedUrl,
} from '../scripts/probe-production-release-endpoints.mjs';

function mockHeaders(values = {}) {
  const normalized = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get(name) {
      return normalized.get(String(name).toLowerCase()) ?? null;
    },
  };
}

function mockResponse({
  status = 200,
  url = 'https://app.sekretbip.net/.well-known/sekret-release.json',
  redirected = false,
  headers = {'content-type': 'application/json'},
  json = {commitSha: 'a'.repeat(40)},
  body = '',
} = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    redirected,
    headers: mockHeaders(headers),
    clone() {
      return {
        async text() {
          return body;
        },
      };
    },
    async json() {
      if (json instanceof Error) throw json;
      return json;
    },
  };
}

test('classifies redirects to a Cloudflare Access team domain', () => {
  assert.equal(
    classifyEndpointProbe({
      redirected: true,
      finalUrl: 'https://sekretbip.cloudflareaccess.com/cdn-cgi/access/login/app',
      status: 200,
      ok: true,
      jsonState: 'invalid',
    }),
    'cloudflare-access-intercepted',
  );
});

test('redacts Cloudflare Access redirect authority and query metadata before evidence retention', async () => {
  const rawRedirect = 'https://private-team.cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net?kid=secret-kid&meta=signed-payload&token=opaque#fragment';
  assert.equal(
    sanitizeObservedUrl(rawRedirect),
    'https://cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net',
  );

  const probe = await probeJsonEndpoint('https://app.sekretbip.net/.well-known/sekret-release.json', {
    fetchImpl: async () => mockResponse({
      status: 200,
      url: rawRedirect,
      redirected: true,
      headers: {'content-type': 'text/html'},
      json: new SyntaxError('not JSON'),
    }),
  });

  assert.equal(probe.classification, 'cloudflare-access-intercepted');
  assert.equal(probe.finalUrl, 'https://cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net');
  const retained = JSON.stringify(probe);
  assert.doesNotMatch(retained, /private-team|secret-kid|signed-payload|opaque|[?&#]/);
});

test('classifies a same-host 200 Cloudflare Access sign-in page without retaining the HTML', async () => {
  const accessHtml = '<!DOCTYPE html><html><head><title>Sign in ・ Cloudflare Access</title></head><body>/cdn-cgi/access/login</body></html>';
  const probe = await probeJsonEndpoint('https://app.sekretbip.net/.well-known/sekret-release.json', {
    fetchImpl: async () =>
      mockResponse({
        status: 200,
        url: 'https://app.sekretbip.net/.well-known/sekret-release.json',
        redirected: false,
        headers: {'content-type': 'text/html; charset=UTF-8'},
        body: accessHtml,
        json: new SyntaxError('not JSON'),
      }),
  });

  assert.equal(probe.accessBlockPage, true);
  assert.equal(probe.classification, 'cloudflare-access-intercepted');
  const retained = JSON.stringify(probe);
  assert.doesNotMatch(retained, /Sign in|Cloudflare Access|cdn-cgi\/access\/login/);
});

test('does not promote ordinary same-host HTML into a Cloudflare Access claim', async () => {
  const probe = await probeJsonEndpoint('https://app.sekretbip.net/.well-known/sekret-release.json', {
    fetchImpl: async () =>
      mockResponse({
        status: 200,
        url: 'https://app.sekretbip.net/.well-known/sekret-release.json',
        redirected: false,
        headers: {'content-type': 'text/html'},
        body: '<html><head><title>Maintenance</title></head><body>Please retry later</body></html>',
        json: new SyntaxError('not JSON'),
      }),
  });

  assert.equal(probe.accessBlockPage, false);
  assert.equal(probe.classification, 'invalid-json');
});

test('treats an opaque forbidden response as an HTTP error without reading its body', async () => {
  const forbidden = await probeJsonEndpoint('https://app.sekretbip.net/.well-known/sekret-release.json', {
    fetchImpl: async () =>
      mockResponse({
        status: 403,
        headers: {'content-type': 'text/html'},
      }),
  });

  assert.equal(forbidden.accessBlockPage, false);
  assert.equal(forbidden.classification, 'http-error');
});

test('collects Access blocking only for positively identified redirect surfaces', async () => {
  const fetchImpl = async (url) => {
    const target = new URL(String(url));
    if (target.hostname === 'app.sekretbip.net') {
      return mockResponse({
        status: 200,
        url: 'https://private-team.cloudflareaccess.com/cdn-cgi/access/login/app.sekretbip.net',
        redirected: true,
        headers: {'content-type': 'text/html'},
        json: new SyntaxError('not JSON'),
      });
    }
    return mockResponse({
      status: 200,
      url: 'https://api.sekretbip.net/health',
      json: {ok: true, releaseSha: 'b'.repeat(40)},
    });
  };

  const evidence = await collectProductionReleaseEndpointEvidence({
    expectedSha: 'b'.repeat(40),
    fetchImpl,
  });

  assert.equal(evidence.version, 3);
  assert.equal(evidence.status, 'cloudflare-access-intercepted');
  assert.deepEqual(evidence.blockedByAccess, ['frontend']);
  assert.equal(evidence.frontend.classification, 'cloudflare-access-intercepted');
  assert.equal(evidence.backend.classification, 'ok');
});

test('keeps successful and malformed JSON classifications unchanged', async () => {
  const okProbe = await probeJsonEndpoint('https://api.sekretbip.net/health', {
    fetchImpl: async () =>
      mockResponse({
        url: 'https://api.sekretbip.net/health',
        json: {ok: true, releaseSha: 'c'.repeat(40)},
      }),
  });
  assert.equal(okProbe.classification, 'ok');
  assert.equal(okProbe.healthOk, true);

  const invalidProbe = await probeJsonEndpoint('https://api.sekretbip.net/health', {
    fetchImpl: async () =>
      mockResponse({
        url: 'https://api.sekretbip.net/health',
        json: new SyntaxError('invalid JSON'),
      }),
  });
  assert.equal(invalidProbe.classification, 'invalid-json');
});
