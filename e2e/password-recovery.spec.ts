import { expect, test } from '@playwright/test';

test('login routes into the forgot-password journey with accessible controls', async ({ page }) => {
  await page.goto('/login');

  const forgotLink = page.getByRole('link', { name: 'Forgot password' });
  await expect(forgotLink).toBeVisible({ timeout: 30_000 });
  await forgotLink.click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByText('Forgot your password?')).toBeVisible();
  await expect(page.getByLabel('Account email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send password reset email' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Sign In' })).toBeVisible();
});

test('forgot-password validates missing and malformed email before contacting auth', async ({ page }) => {
  await page.goto('/forgot-password');

  const sendButton = page.getByRole('button', { name: 'Send password reset email' });
  await sendButton.click();
  await expect(page.getByRole('alert')).toHaveText('Enter the email connected to your Bip account.');

  await page.getByLabel('Account email').fill('not-an-email');
  await sendButton.click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');
});

test('forgot-password fails clearly when the local browser test has no Supabase config', async ({ page }) => {
  await page.goto('/forgot-password');

  await page.getByLabel('Account email').fill('teen@example.com');
  await page.getByRole('button', { name: 'Send password reset email' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Auth unavailable. Check the Supabase app configuration.',
  );
});

test('direct reset-password visit fails closed without recovery evidence', async ({ page }) => {
  await page.goto('/reset-password');

  await expect(page.getByText('Choose a new password')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('That reset link cannot be used.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Sign In' })).toBeVisible();
});

test('completed password reset returns a clear sign-in confirmation', async ({ page }) => {
  await page.goto('/login?passwordReset=1');

  await expect(page.getByRole('alert')).toHaveText(
    'Password updated. Sign in with your new password.',
  );
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('password recovery screens fit a phone viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/forgot-password', '/reset-password']) {
    await page.goto(route);
    await expect(page.getByText(/password/i).first()).toBeVisible({ timeout: 30_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, `${route} should not overflow horizontally`).toBe(false);
  }
});
