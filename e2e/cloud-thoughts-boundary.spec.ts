import { expect, test } from '@playwright/test';

test('unauthenticated direct Cloud navigation stays behind the public boundary', async ({ page }) => {
  await page.goto('/cloud?bipDevAudience=teen');

  await expect(page.getByTestId('web-welcome-enter')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('cloud-thought-input')).toHaveCount(0);
  await expect(page.getByTestId('cloud-thought-send')).toHaveCount(0);
  await expect(page.getByTestId('cloud-thought-retry')).toHaveCount(0);

  const publicText = await page.locator('body').innerText();
  expect(publicText).not.toContain("Cloud couldn't answer right now");
  expect(publicText).not.toContain('What you type is processed to create a reply');
});
