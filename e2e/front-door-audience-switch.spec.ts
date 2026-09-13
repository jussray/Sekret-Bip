import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    htmlClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));
  const viewportWidth = Math.min(
    metrics.innerWidth,
    metrics.htmlClientWidth,
    metrics.bodyClientWidth || metrics.innerWidth,
  );
  expect(Math.max(metrics.htmlScrollWidth, metrics.bodyScrollWidth)).toBeLessThanOrEqual(viewportWidth + 1);
}

test('caveman visual teaches the doorway, stays contained, then clears for interaction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  const primer = page.getByTestId('web-welcome-caveman-visual');
  await expect(primer).toBeVisible({ timeout: 5_000 });
  await expect(primer).toHaveAccessibleName('You. Your space. Enter.');
  await expect(primer).toContainText('YOU');
  await expect(primer).toContainText('YOUR SPACE');
  await expect(primer).toContainText('ENTER');

  const primerBox = await primer.boundingBox();
  expect(primerBox).not.toBeNull();
  expect(primerBox!.x).toBeGreaterThanOrEqual(0);
  expect(primerBox!.x + primerBox!.width).toBeLessThanOrEqual(320);
  await expectNoDocumentHorizontalOverflow(page);

  await expect(page.getByTestId('web-welcome-scene-settled')).toBeAttached({ timeout: 5_000 });
  await expect(primer).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
  await expectNoDocumentHorizontalOverflow(page);
});

for (const viewport of VIEWPORTS) {
  test(`public front door switches one audience at a time on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expect(page.getByText("I'm Teen", { exact: true })).toHaveCount(0);
    await expect(page.getByText('I’m a Parent / Guardian', { exact: true })).toHaveCount(0);
    await expectNoDocumentHorizontalOverflow(page);

    const audienceSwitch = page.getByTestId('web-welcome-audience-switch');
    await expect(audienceSwitch).toHaveAccessibleName('Switch to the Bip Jr and Family welcome');
    await audienceSwitch.click();

    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-teen')).toHaveCount(0);
    await expect(page.getByText('YOUR FAMILY. YOUR SPACE.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bip Jr family welcome — continue to family setup' })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);

    await expect(audienceSwitch).toHaveAccessibleName("Switch to the Se'kret Bip Teen welcome");
    await audienceSwitch.click();

    await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);

    await testInfo.attach(`front-door-audience-switch-${viewport.name}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}
