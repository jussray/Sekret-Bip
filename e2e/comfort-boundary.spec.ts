import { expect, test } from '@playwright/test';

test('unauthenticated direct Comfort navigation stays behind the public boundary', async ({ page }) => {
  await page.goto('/comfort?bipDevAudience=teen');

  await expect(page.getByTestId('web-welcome-enter')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('comfort-step-1')).toHaveCount(0);
  await expect(page.getByTestId('comfort-open-calm')).toHaveCount(0);
  await expect(page.getByTestId('comfort-done')).toHaveCount(0);

  const publicText = await page.locator('body').innerText();
  expect(publicText).not.toContain('Grounding Steps');
  expect(publicText).not.toContain('comfort_completed');
});
