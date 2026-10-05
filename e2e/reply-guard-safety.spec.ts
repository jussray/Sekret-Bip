import { expect, test } from '@playwright/test';

test('Pages preserves explicit safety resources when the Worker is unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', async (dialog) => dialog.dismiss());

  await page.goto('/pages?bipDevSide=teen', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Start talking to Suhana', { exact: true })).toBeVisible({ timeout: 15_000 });

  const pageInput = page.getByRole('textbox').first();
  await expect(pageInput).toBeVisible({ timeout: 15_000 });
  await pageInput.fill('I am not safe here');

  const sendControl = page.getByText('💜', { exact: true }).last();
  await expect(sendControl).toBeVisible({ timeout: 15_000 });
  await sendControl.click();

  const reply = page.getByText(/Your safety comes first\./i);
  await expect(reply).toBeVisible({ timeout: 15_000 });
  await expect(reply).toContainText('911');
  await expect(reply).toContainText('988');
  await expect(reply).toContainText('741741');

  await expect(page.getByText('I am not safe here', { exact: true })).toBeVisible();
});
