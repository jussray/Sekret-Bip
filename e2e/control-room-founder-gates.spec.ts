import { expect, type Page, test } from '@playwright/test';

async function openControlRoom(page: Page) {
  // The repository documents the founder room as /dev/control-room, while the
  // Expo Router group is app/(dev)/control-room.tsx. Keep both path variants
  // covered so this test protects the shipped route without depending on one
  // router spelling.
  for (const path of ['/dev/control-room', '/control-room']) {
    await page.goto(path);

    const switcher = page.getByText('Prompt OS', { exact: true });
    try {
      await expect(switcher).toBeVisible({ timeout: 15_000 });
      return;
    } catch {
      // Try the next route spelling before failing with a clearer assertion.
    }
  }

  await expect(page.getByText('Prompt OS', { exact: true })).toBeVisible({ timeout: 30_000 });
}

test.describe('Founder Control Room authorization gates', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('non-founder runtime locks Prompt OS and Worker panels when founder profile is unavailable', async ({ page }) => {
    await openControlRoom(page);

    await page.getByText('Prompt OS', { exact: true }).click();
    await expect(page.getByText('Prompt OS is locked.', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Founder or admin access is required to view prompt, persona, and quality operations\./i)).toBeVisible();
    await expect(page.getByText('PROMPT OS · LIBRARY', { exact: true })).toHaveCount(0);

    await page.getByText('Worker', { exact: true }).click();
    await expect(page.getByText('Worker Panel is locked.', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Founder or admin access is required to fire test shots at the live Worker\./i)).toBeVisible();
    await expect(page.getByText('Live Shot Lab', { exact: true })).toHaveCount(0);
  });
});
