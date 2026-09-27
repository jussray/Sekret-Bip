import { expect, test } from '@playwright/test';

test('Teen cycle calendar tells the truth about account sync and Parent Pages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/period-calendar?bipDevSide=teen', { waitUntil: 'networkidle' });

  await expect(page.getByText('cycle calendar 🩸', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('track your cycle, quietly. not shown in Parent Pages.', { exact: true })).toBeVisible();
  await expect(page.getByText('💜 private · account synced', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "tap any day to mark it 🩸 · cycle days sync to your account so they can follow you between devices. they aren't shown in Parent Pages. 🔒",
      { exact: true },
    ),
  ).toBeVisible();

  await expect(page.getByText(/nothing leaves/i)).toHaveCount(0);
  await expect(page.getByText(/only you see this/i)).toHaveCount(0);
  await expect(page.getByText(/private · on-device/i)).toHaveCount(0);

  await testInfo.attach('teen-cycle-calendar-privacy-copy.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});
