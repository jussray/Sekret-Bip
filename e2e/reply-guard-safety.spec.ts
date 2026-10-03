import { expect, test } from '@playwright/test';

test('Pages preserves explicit safety resources when the Worker is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', async (dialog) => dialog.dismiss());

  await page.goto('/pages?bipDevSide=teen', { waitUntil: 'domcontentloaded' });

  const suhanaTab = page.getByRole('button', { name: /Suhana/i }).first();
  await expect(suhanaTab).toBeVisible({ timeout: 15_000 });
  await suhanaTab.click();

  const pageInput = page.getByPlaceholder('Tell it how it happened…');
  await expect(pageInput).toBeVisible({ timeout: 15_000 });
  await pageInput.fill('I am not safe here');

  await page.getByRole('button', { name: 'Save page', exact: true }).click();

  const reply = page.getByText(/Your safety comes first\./i);
  await expect(reply).toBeVisible({ timeout: 15_000 });
  await expect(reply).toContainText('911');
  await expect(reply).toContainText('988');
  await expect(reply).toContainText('741741');

  await expect(page.getByText('I am not safe here', { exact: true })).toBeVisible();
});
