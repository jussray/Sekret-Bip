import { expect, test } from '@playwright/test';

test('unknown reconnaissance stays in a synthetic successor hallway', async ({ request }) => {
  const first = await request.get('/.env', {
    headers: {
      'User-Agent': 'PlaywrightSecurityCrawler/1.0',
      'CF-Connecting-IP': '198.51.100.77',
      'CF-Ray': 'playwright-hallway-first',
    },
  });

  expect(first.status()).toBe(200);
  expect(first.headers()['cache-control']).toContain('no-store');
  const firstBody = await first.json() as {
    request_id: string;
    continuation: string[];
    cursor: string;
  };
  expect(firstBody.continuation).toHaveLength(8);
  expect(firstBody.continuation.every((value) => value.startsWith('http://127.0.0.1:8799/'))).toBe(true);

  const setCookie = first.headers()['set-cookie'];
  expect(setCookie).toContain('__Host-juss_hallway=');
  expect(setCookie).toContain('HttpOnly');
  expect(setCookie).toContain('SameSite=Strict');
  const cookiePair = setCookie.split(';', 1)[0];

  const second = await request.get(firstBody.continuation[0], {
    headers: {
      'User-Agent': 'PlaywrightSecurityCrawler/1.0',
      'CF-Connecting-IP': '198.51.100.77',
      'CF-Ray': 'playwright-hallway-second',
      Cookie: cookiePair,
    },
  });

  expect(second.status()).toBe(200);
  const secondBody = await second.json() as {
    request_id: string;
    continuation: string[];
  };
  expect(secondBody.request_id).not.toBe(firstBody.request_id);
  expect(secondBody.continuation).toHaveLength(8);
  expect(secondBody.continuation.every((value) => value.startsWith('http://127.0.0.1:8799/'))).toBe(true);
});
