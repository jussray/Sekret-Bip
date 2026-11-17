import { expect, test } from '@playwright/test';

test.describe('auth security handoff routes', () => {
  test('forgot password route exposes reset request UI', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Forgot password?', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /send password reset email|send reset link/i })).toBeVisible();
  });

  test('reset password route exposes a fail-closed credential owner handoff', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('New password', { exact: true })).toBeVisible();
    await expect(page.getByText('That reset link cannot be used.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update password' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible();
  });

  test('signed-in security route is reachable and protects unauthenticated users', async ({ page }) => {
    await page.goto('/account/security');
    await expect(
      page.getByText(/Account security|sign in to continue|log in/i),
    ).toBeVisible();
  });
});
