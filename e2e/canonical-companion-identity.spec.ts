import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const ARTIFACT_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'canonical-companion-identity',
);

test('onboarding exposes canonical companion identity only', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/identity', { waitUntil: 'networkidle' });

  await expect(page.getByText('Make this space feel like you.', { exact: true })).toBeVisible();

  for (const name of ['Girl', 'Boy', 'My own way', 'Suhana', 'Sy', 'Cloud', 'Night']) {
    await expect(page.getByRole('radio', { name, exact: true })).toBeVisible();
  }

  await expect(page.getByText('Raylene', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Rylane', { exact: true })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Girl', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Girl', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Suhana', exact: true })).toBeChecked();

  await page.getByRole('radio', { name: 'Boy', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Boy', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Sy', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Suhana', exact: true })).not.toBeChecked();

  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const body = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.writeFile(path.join(ARTIFACT_DIR, '01-canonical-companion-onboarding.png'), body);
  await testInfo.attach('canonical-companion-onboarding.png', {
    body,
    contentType: 'image/png',
  });
});
