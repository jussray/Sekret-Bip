import { expect, test } from '@playwright/test';

test('public signup stays retryable when no Auth request reaches the server', async ({ page }) => {
  let signupAttempts = 0;
  let passwordProbeAttempts = 0;

  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'POST' && url.pathname.endsWith('/signup')) {
      signupAttempts += 1;
      await route.abort('failed');
      return;
    }

    if (
      request.method() === 'POST' &&
      url.pathname.endsWith('/token') &&
      url.searchParams.get('grant_type') === 'password'
    ) {
      passwordProbeAttempts += 1;
      await route.abort('failed');
      return;
    }

    // No request from this test may reach real production Auth.
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Blocked by public signup transport test.' }),
    });
  });

  await page.goto('/signup?side=teen');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i }).click();
  await page.getByRole('button', { name: /Continue with teen setup/i }).click();
  await page.getByPlaceholder('email').fill('fresh-public-signup@example.invalid');
  await page.getByPlaceholder('password (8+ characters)').fill('PlaywrightOnly-123!');
  await page.getByPlaceholder('confirm password').fill('PlaywrightOnly-123!');
  await page.getByRole('button', { name: /^next$/i }).click();

  await page.getByPlaceholder('username').fill(`pw_transport_${Date.now()}`);
  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'We could not reach the account server. Check your connection and try again.',
    { timeout: 30_000 },
  );
  await expect(page.getByText('Check your email')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled();
  expect(signupAttempts).toBe(2);
  expect(passwordProbeAttempts).toBe(1);
});
