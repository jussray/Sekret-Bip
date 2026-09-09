import { expect, test } from '@playwright/test';

const expectedReleaseSha = process.env.EXPECTED_RELEASE_SHA?.trim().toLowerCase();
const BACKEND_HEALTH_URL = 'https://api.sekretbip.net/health';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

test('production exposes the exact expected Pages and Worker release commit', async ({ request }) => {
  test.skip(!expectedReleaseSha, 'EXPECTED_RELEASE_SHA is required for exact production release proof.');

  const response = await request.get(`/.well-known/sekret-release.json?playwright=${Date.now()}`, {
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
    },
  });
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('application/json');

  const release = await response.json();
  expect(release).toMatchObject({
    schemaVersion: 2,
    app: 'sekret-bip',
    surface: 'web-front-door',
    environment: 'production',
    commitSha: expectedReleaseSha,
    branch: 'main',
    deploymentProvider: 'cloudflare-pages',
    canonicalUrl: 'https://sekretbip.net',
  });

  const backendResponse = await request.get(`${BACKEND_HEALTH_URL}?playwright=${Date.now()}`, {
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
    },
  });
  expect(backendResponse.ok()).toBe(true);
  expect(backendResponse.headers()['content-type']).toContain('application/json');

  const backendHealth = await backendResponse.json();
  expect(backendHealth).toMatchObject({
    ok: true,
    worker: 'sekret-backend',
    releaseSha: expectedReleaseSha,
  });
});

test('production Teen front door renders and Enter reaches Teen onboarding', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
  await expect(page.getByText('Come on in.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('web-welcome-suhana')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('production-teen-front-door.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });

  await page.getByTestId('web-welcome-enter').click();
  await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
});

test('production Bip Jr front door renders and Enter reaches parent onboarding', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'networkidle' });

  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('YOUR FAMILY. YOUR SPACE.', { exact: true })).toBeVisible();
  await expect(page.getByText('Come on in.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('web-welcome-suhana')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('production-bip-jr-front-door.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });

  await page.getByTestId('web-welcome-enter').click();
  await expect(page).toHaveURL(/\/parent-welcome(?:\?|$)/);
  await expect(page.getByRole('button', { name: 'Create my Parent account' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'I already have an account' })).toBeVisible({ timeout: 30_000 });
  await expectNoHorizontalOverflow(page);
});

test('unauthenticated visitor cannot reach a protected teen route from a blank session', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/comfort');

  await expect(page.getByTestId('web-welcome-enter')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Grounding Steps')).not.toBeVisible();
  await expect(page.getByText('Bridge')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('unauthenticated visitor cannot reach a protected parent route from a blank session', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/approvals');

  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  await expect(page.getByText('To Review')).not.toBeVisible();
  await expect(page.getByText('Bridge')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('signup recovers from an ambiguous Supabase timeout without creating a real user', async ({ page }) => {
  let signupAttempts = 0;
  let passwordProbeAttempts = 0;

  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'POST' && url.pathname.endsWith('/signup')) {
      signupAttempts += 1;
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'request_timeout',
          message: 'Processing this request timed out, please retry after a moment.',
        }),
      });
      return;
    }

    if (
      request.method() === 'POST' &&
      url.pathname.endsWith('/token') &&
      url.searchParams.get('grant_type') === 'password'
    ) {
      passwordProbeAttempts += 1;
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'email_not_confirmed',
          msg: 'Email not confirmed',
          message: 'Email not confirmed',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Blocked by signup recovery test.' }),
    });
  });

  await page.goto('/signup?side=teen');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i }).click();
  await page.getByRole('button', { name: /Continue with teen setup/i }).click();
  await page.getByPlaceholder('email').fill('playwright-signup-timeout@example.invalid');
  await page.getByPlaceholder('password (8+ characters)').fill('PlaywrightOnly-123!');
  await page.getByPlaceholder('confirm password').fill('PlaywrightOnly-123!');
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByPlaceholder('username').fill(`pw_timeout_${Date.now()}`);
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByText('Check your email')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/account was created.*confirmation is still pending/i)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(signupAttempts).toBe(1);
  expect(passwordProbeAttempts).toBe(1);
});
