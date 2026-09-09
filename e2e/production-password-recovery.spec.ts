import { expect, test, type Page } from '@playwright/test';

const testEmail = 'recovery-check@example.invalid';

async function submit(page: Page) {
  await page.goto('/forgot-password');
  await page.getByLabel('Account email').fill(testEmail);
  await page.getByRole('button', { name: 'Send password reset email' }).click();
}

test('gateway timeout stays unconfirmed', async ({ page }) => {
  let requests = 0;
  await page.route('**/auth/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname.endsWith('/recover')) {
      requests += 1;
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'request_timeout', message: 'Request timed out.' }),
      });
      return;
    }
    await route.fulfill({ status: 400, body: 'blocked' });
  });

  await submit(page);
  await expect(page.getByRole('alert')).toContainText('could not confirm the reset request', { timeout: 30_000 });
  await expect(page.getByText('Check your email')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send password reset email' })).toBeEnabled();
  expect(requests).toBe(1);
});

test('browser failure stays retryable', async ({ page }) => {
  let requests = 0;
  await page.route('**/auth/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname.endsWith('/recover')) {
      requests += 1;
      await route.abort('failed');
      return;
    }
    await route.fulfill({ status: 400, body: 'blocked' });
  });

  await submit(page);
  await expect(page.getByRole('alert')).toContainText('Could not reach the account server', { timeout: 30_000 });
  await expect(page.getByText('Check your email')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send password reset email' })).toBeEnabled();
  expect(requests).toBe(1);
});
