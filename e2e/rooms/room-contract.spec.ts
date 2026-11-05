import { expect, test } from '@playwright/test';

const LOCKED_BOTTOM_NAV = ['Room', 'Pages', 'Calm', 'Circle', 'More'];

function normalizeTabLabel(label: string): string {
  return label
    .normalize('NFKC')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/(teen)/room');
  await page.waitForLoadState('domcontentloaded');
});

test('keeps the existing teen bottom navigation locked', async ({ page }) => {
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(LOCKED_BOTTOM_NAV.length, { timeout: 30_000 });

  const labels = await tabs.allInnerTexts();
  const normalized = labels.map(normalizeTabLabel);
  expect(normalized).toEqual(LOCKED_BOTTOM_NAV);
});

test('keeps feature routes out of the visible bottom navigation', async ({ page }) => {
  const tabs = page.locator('[role="tab"]');
  const labels = (await tabs.allInnerTexts()).join(' ');
  expect(labels).not.toMatch(/Bridge|Bippin|Voice Bip|Se’kret|Se'kret|User Room|Rewards|Crew/i);
});

test('user room remains a customizable personal space with a tappable companion', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Customize your room in VibeLab' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /is here\. Tap to talk\./i })).toBeVisible();
});

test('room stays within phone width', async ({ page }) => {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test.fixme('companion rooms reject dashboard and update cards', async () => {
  // Activated with the Night vertical slice. The companion-room route must expose
  // data-room-kind="companion" and render no elements marked data-user-room-card.
});

test.fixme('Night moves between named room anchors and persists the last activity', async () => {
  // Activated with the state-driven actor implementation.
});
