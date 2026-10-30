import { expect, test } from '@playwright/test';

// These requests hit the actual canonical Worker entrypoint in local workerd,
// not a mocked handler or a public website.
test('canonical Worker health route survives local hallway containment', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.worker).toBe('sekret-backend');
  expect(typeof payload.releaseSha).toBe('string');
});

test('synthetic reconnaissance follows an Art of War-gated Worker response', async ({ request }) => {
  const response = await request.get('/.env', {
    headers: {
      'User-Agent': 'PlaywrightHallwayPreview/1.0',
      'CF-Connecting-IP': '203.0.113.44',
    },
  });
  expect(response.status()).toBe(404);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const body = await response.json();
  expect(body).toEqual({ error: 'not_found' });
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('203.0.113.44');
  expect(serialized).not.toContain('hallway-preview-only');
});

test('existing origin authorization takes priority over hallway routing', async ({ request }) => {
  const response = await request.get('/.env', {
    headers: {
      'Origin': 'https://untrusted.example.invalid',
      'User-Agent': 'PlaywrightHallwayPreview/1.0',
      'CF-Connecting-IP': '203.0.113.44',
    },
  });
  expect(response.status()).toBe(403);
  expect(await response.json()).toEqual({ error: 'origin not allowed' });
});
