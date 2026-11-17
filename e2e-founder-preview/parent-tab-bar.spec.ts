import { expect, test } from '@playwright/test';

// The Parent tab bar is exactly Room, Bridge, Pages, Circle, More. Every other
// parent route must be registered with `href: null` so Expo Router does not add it.
test('the Parent tab bar shows only its five canonical tabs', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/bip-jr');
  await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 60_000 });

  const labels = (await page.getByRole('tab').allInnerTexts())
    .map(text => text.split('\n').map(part => part.trim()).filter(Boolean).pop());
  expect(labels).toEqual(['Room', 'Bridge', 'Pages', 'Circle', 'More']);
});

test('routes removed from the tab bar are still reachable directly', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/bip-jr', '/teen-verification', '/circle/feed']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}(?:\\?.*)?$`), { timeout: 60_000 });
    await expect(page.getByRole('tab', { name: /Room/ })).toBeVisible({ timeout: 60_000 });
  }
});
