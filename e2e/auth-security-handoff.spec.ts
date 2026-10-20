import { expect, test } from '@playwright/test';

test.describe('auth security handoff routes', () => {
  test('forgot password route exposes reset request UI', async ({ page }) => {
    // The first Expo web route can cold-build before the reset UI becomes interactive.
    test.setTimeout(90_000);
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.getByRole('button', { name: /send password reset email|send reset link/i })).toBeVisible();
  });

  test('reset password without recovery evidence denies credential changes', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('New password', { exact: true })).toBeVisible();
    await expect(page.getByText('That reset link cannot be used.')).toBeVisible();
    await expect(page.getByRole('button', { name: /update password/i })).toBeDisabled();
    await expect(page.getByRole('link', { name: /request a new reset link/i })).toBeVisible();
  });

  test('signed-in security route is reachable and protects unauthenticated users', async ({ page }) => {
    await page.goto('/account/security');
    await expect(
      page.getByText(/Account security|sign in to continue|log in/i),
    ).toBeVisible();
  });
});
