import { expect, test } from '@playwright/test';

// Regression for #417's "Download my data" acceptance criteria: the control
// must be easy to find in Settings (not buried), and — per this repo's
// "never signal success on failure" rule (CLAUDE.md) — a failed export must
// never claim success. This default e2e config runs with Supabase
// unconfigured (see playwright.config.ts), so clicking the button here
// genuinely exercises the failure path for real, not a mock.

test('Download my data is discoverable in teen settings, outside the danger zone', async ({ page }) => {
  await page.goto('/(teen)/settings');
  await page.waitForLoadState('domcontentloaded');

  const dataExportButton = page.getByRole('button', { name: 'Download my data' });
  await expect(dataExportButton).toBeVisible({ timeout: 30_000 });

  // "Your data" must render before "Danger zone", not inside it.
  const bodyText = await page.locator('body').innerText();
  const dataIndex = bodyText.indexOf('Your data');
  const dangerIndex = bodyText.indexOf('Danger zone');
  expect(dataIndex).toBeGreaterThan(-1);
  expect(dangerIndex).toBeGreaterThan(-1);
  expect(dataIndex).toBeLessThan(dangerIndex);
});

test('a failed export never claims success (no Supabase configured in this environment)', async ({ page }) => {
  // react-native-web's Alert.alert is a no-op (confirmed by reading
  // react-native-web/dist/cjs/exports/Alert/index.js: `static alert() {}`) —
  // it produces no DOM text and no native dialog. DataExportControls
  // therefore also renders the failure message inline so web users get real
  // feedback; that inline text is what this test can observe.
  await page.goto('/(teen)/settings');
  await page.waitForLoadState('domcontentloaded');

  const dataExportButton = page.getByRole('button', { name: 'Download my data' });
  await expect(dataExportButton).toBeVisible({ timeout: 30_000 });
  await dataExportButton.click();

  const errorText = page.getByText(/Data export is unavailable|Could not reach/i);
  await expect(errorText).toBeVisible({ timeout: 10_000 });

  // The success modal (which shows "Your data export") must never appear,
  // since the export genuinely failed.
  await expect(page.getByText('Your data export')).not.toBeVisible();
});

test('Download my data is discoverable in parent settings too, outside the danger zone', async ({ page }) => {
  await page.goto('/(parent)/settings');
  await page.waitForLoadState('domcontentloaded');

  const dataExportButton = page.getByRole('button', { name: 'Download my data' });
  await expect(dataExportButton).toBeVisible({ timeout: 30_000 });

  const bodyText = await page.locator('body').innerText();
  const dataIndex = bodyText.indexOf('Your data');
  const dangerIndex = bodyText.indexOf('Danger zone');
  expect(dataIndex).toBeGreaterThan(-1);
  expect(dangerIndex).toBeGreaterThan(-1);
  expect(dataIndex).toBeLessThan(dangerIndex);
});
