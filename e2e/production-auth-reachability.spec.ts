import { expect, test } from '@playwright/test';

const expectedSupabaseUrl = 'https://tbsevonvegdnlyjgplmm.supabase.co';

type BrowserProbe = {
  ok: boolean;
  status: number;
  contentType: string;
  leaksKey: boolean;
  leaksRestrictedMarker: boolean;
  errorKind: string;
};

test('production browser validates the real Supabase publishable key and reaches Auth read-only', async ({
  page,
}) => {
  const observedAuthRequests: Array<{ url: string; key: string }> = [];

  // Capture the public frontend's actual Auth configuration from a synthetic
  // signup attempt. Never let a signup or any other Auth write reach production.
  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET' && url.pathname === '/auth/v1/settings') {
      await route.continue();
      return;
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/signup')) {
      observedAuthRequests.push({
        url: url.origin,
        key: request.headers()['apikey'] ?? '',
      });
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'read_only_verification',
        message: 'Auth writes are blocked by the production read-only test.',
      }),
    });
  });

  await page.goto('/signup?side=teen');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Teen mode starts/i }).click();
  await page.getByRole('button', { name: /Continue with teen setup/i }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('auth-readonly-proof@example.invalid');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('PlaywrightOnly-123!');
  await page.getByRole('textbox', { name: 'Confirm password', exact: true }).fill('PlaywrightOnly-123!');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('auth_readonly_proof');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect.poll(() => observedAuthRequests.length).toBeGreaterThan(0);
  const { url, key } = observedAuthRequests[0];
  expect(url).toBe(expectedSupabaseUrl);
  expect(
    key.startsWith('sb_publishable_') || key.startsWith('eyJ'),
    'The public frontend must use a publishable or legacy anon key',
  ).toBe(true);
  expect(key.startsWith('sb_secret_'), 'A secret key must never reach the browser').toBe(false);

  // GET /settings is the only Auth request permitted to reach production.
  // Return booleans, not raw body text or any key material, in test evidence.
  const probes = await page.evaluate(
    async ({ url, key }) => {
      const read = async (
        pathname: string,
        headers: Record<string, string>,
      ): Promise<BrowserProbe> => {
        try {
          const response = await fetch(`${url}${pathname}`, {
            method: 'GET',
            headers,
          });
          const body = await response.text();
          return {
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type') ?? '',
            leaksKey: body.includes(key),
            leaksRestrictedMarker: /sb_secret_|service[_-]?role/i.test(body),
            errorKind: '',
          };
        } catch (error) {
          return {
            ok: false,
            status: 0,
            contentType: '',
            leaksKey: false,
            leaksRestrictedMarker: false,
            errorKind: error instanceof Error ? error.name : 'UnknownError',
          };
        }
      };

      return {
        withoutKey: await read('/auth/v1/settings', { Accept: 'application/json' }),
        auth: await read('/auth/v1/settings', {
          apikey: key,
          Accept: 'application/json',
        }),
      };
    },
    { url, key },
  );

  expect([401, 403], JSON.stringify(probes.withoutKey)).toContain(probes.withoutKey.status);
  expect(probes.withoutKey.ok).toBe(false);
  expect(probes.auth.status, JSON.stringify(probes.auth)).toBe(200);
  expect(probes.auth.ok, JSON.stringify(probes.auth)).toBe(true);
  expect(probes.auth.contentType).toContain('application/json');
  expect(probes.auth.leaksKey).toBe(false);
  expect(probes.auth.leaksRestrictedMarker).toBe(false);
});
