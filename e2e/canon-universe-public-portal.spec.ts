import { test, expect } from '@playwright/test';

const portals = ['teens', 'bip-jr', 'parents'] as const;

test('approved welcome exposes three clickable illustrated portals, not duplicate buttons', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('bip-universe-hero')).toBeVisible();
  await expect(page.getByTestId('web-welcome-audience-switch')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter')).toHaveCount(0);
  for (const id of portals) await expect(page.getByTestId(`bip-universe-portal-${id}`)).toBeVisible();
});

test('mobile portals have 44px touch targets without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const id of portals) {
    const target = page.getByTestId(`bip-universe-portal-${id}`);
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

for (const { id, next } of [
  { id: 'teens', next: /\/welcome(?:\?|$)/ },
  { id: 'bip-jr', next: /\/parent-welcome(?:\?|$)/ },
  { id: 'parents', next: /\/parent-welcome(?:\?|$)/ },
] as const) {
  test(`${id} portal opens the existing age-safe onboarding path`, async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId(`bip-universe-portal-${id}`).click();
    await expect(page).toHaveURL(next);
  });
}
