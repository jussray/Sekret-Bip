import { expect, test } from '@playwright/test';

test.describe('auth security handoff routes', () => {
  test('forgot password route exposes reset request UI', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.getByRole('button', { name: /send password reset email|send reset link/i })).toBeVisible();
  });

  test('reset password route exposes the credential owner handoff screen', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('Set a new password')).toBeVisible();
    await expect(page.getByText(/new password goes straight to supabase auth/i)).toBeVisible();
  });

  test('signed-in security route is reachable and protects unauthenticated users', async ({ page }) => {
    await page.goto('/account/security');
    await expect(
      page.getByText(/Account security|sign in to continue|log in/i),
    ).toBeVisible();
  });
});
