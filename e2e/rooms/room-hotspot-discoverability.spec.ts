import { expect, test } from '@playwright/test';

// Regression for issue #958: the one-time hotspot "what is this" tour used to
// be hardcoded to a single hotspot id, so every other hotspot in the room
// never revealed its purpose before first interaction. This proves the real
// rendered room now cycles through more than one hotspot's hint text.

test('room hotspot tour reveals more than one hotspot label before any interaction', async ({ page }) => {
  await page.goto('/(teen)/room');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'Customize your room in VibeLab' }))
    .toBeVisible({ timeout: 30_000 });

  const seenHints = new Set<string>();
  const deadline = Date.now() + 9_000;

  while (Date.now() < deadline && seenHints.size < 2) {
    const visibleHints = await page.evaluate(() => {
      // The tap-hint text nodes are the small floating labels rendered only
      // while a hotspot is in its one-time "hinted" state.
      return Array.from(document.querySelectorAll('*'))
        .map((el) => el.textContent?.trim() ?? '')
        .filter((text) => /^(tap |look out|sit in|reach out|float up|voice bip corner)/i.test(text));
    });
    for (const hint of visibleHints) seenHints.add(hint);
    await page.waitForTimeout(250);
  }

  expect(seenHints.size).toBeGreaterThanOrEqual(2);
});

test('hotspot press behavior is unchanged: tapping a hotspot still navigates away from the room', async ({ page }) => {
  await page.goto('/(teen)/room');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'Customize your room in VibeLab' }))
    .toBeVisible({ timeout: 30_000 });

  const hotspotButtons = page.locator('[role="button"][aria-label]');
  const count = await hotspotButtons.count();
  expect(count).toBeGreaterThan(0);

  const beforeUrl = page.url();
  // Press the first accessible hotspot-shaped button that isn't the
  // VibeLab/companion controls already covered by room-contract.spec.ts.
  const target = page.getByRole('button', { name: /journal|cloud|headphones|window|bed|mic|board|wall|bridge|voice bip corner/i }).first();
  await expect(target).toBeVisible({ timeout: 30_000 });
  await target.click();
  await page.waitForTimeout(500);
  expect(page.url()).not.toEqual(beforeUrl);
});
