import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('canonical Comfort and Cloud routes', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('Cloud renders the canonical thought surface and returns to Calm', async ({ page }) => {
    await page.goto('/cloud');

    await expect(page.getByText('Cloud Thoughts', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByPlaceholder('let it out softly...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'brain dump' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Different prompt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send to the clouds' })).toBeDisabled();

    await page.getByRole('button', { name: 'brain dump' }).click();
    await expect(page.getByText('Let it all out. No filter, no judgment.', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(/\/calm(?:\?.*)?$/);
  });

  test('Comfort renders grounding controls and routes into Calm', async ({ page }) => {
    await page.goto('/comfort');

    await expect(page.getByText('Comfort Mode 🚨', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('cloud is here · rainy room', { exact: true })).toBeVisible();
    await expect(page.getByText('Grounding Steps', { exact: true })).toBeVisible();
    await expect(page.getByText('Another Calm Thought ✨', { exact: true })).toBeVisible();
    await expect(page.getByText('🌙 Go to Calm Space', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByText('🌙 Go to Calm Space', { exact: true }).click();
    await expect(page).toHaveURL(/\/calm(?:\?.*)?$/);
  });
});
