import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const VISUAL_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'scrapbook-companion-check-in',
);

test('approved Sy evening scrapbook check-in renders at 390x844 and hands off to Pages', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Freeze only the browser witness at an evening hour so the exact approved
  // Sy composition is deterministic. Production still uses real local time.
  await page.addInitScript(() => {
    Object.defineProperty(Date.prototype, 'getHours', {
      configurable: true,
      value: () => 18,
    });
  });

  await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=sy', {
    waitUntil: 'domcontentloaded',
  });

  const scene = page.getByTestId('scrapbook-companion-scene');
  const cta = page.getByTestId('scrapbook-bip-cta');

  await expect(scene).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('EVENING CHECK-IN', { exact: true })).toBeVisible();
  await expect(page.getByText('Sy', { exact: true })).toBeVisible();
  await expect(page.getByText('you made it through today.', { exact: true })).toBeVisible();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAccessibleName('Bip with Sy');

  // This is an immersive scene, not a normal tab surface. The screen owns its
  // single scrapbook back control; global Mood/back chrome and the tab bar must
  // not stack on top of the approved composition.
  await expect(page.getByText('Mood', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Back', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Pages', { exact: true })).toBeHidden();
  await expect(page.getByText('Calm', { exact: true })).toBeHidden();
  await expect(page.getByText('Circle', { exact: true })).toBeHidden();
  await expect(page.getByText('More', { exact: true })).toBeHidden();

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'sy-evening-390x844.png'), screenshot);
  await testInfo.attach('sy-evening-390x844.png', {
    body: screenshot,
    contentType: 'image/png',
  });

  await cta.click();
  await expect(page).toHaveURL(/\/pages(?:\/|\?|$)/);
});

test('Cloud glow is rendered in the real scrapbook browser scene at 390x844', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=cloud', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('scrapbook-companion-scene');
  const aura = page.getByTestId('scrapbook-cloud-aura');
  await expect(scene).toBeVisible({ timeout: 15_000 });
  await expect(aura).toBeVisible();
  await expect(aura).toHaveCSS('background-color', 'rgba(123, 216, 255, 0.36)');
  await expect(page.getByTestId('scrapbook-bip-cta')).toHaveAccessibleName('Bip with Cloud');

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'cloud-glow-390x844.png'), screenshot);
  await testInfo.attach('cloud-glow-390x844.png', { body: screenshot, contentType: 'image/png' });
});

test('Ja alias reaches the existing Oracle-guided Pages tab without a duplicate character', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=ja', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('scrapbook-companion-scene')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('scrapbook-ja-presence')).toBeVisible();
  await expect(page.getByTestId('scrapbook-bip-cta')).toHaveAccessibleName('Bip with Ja');
  // Ja appears in both the Polaroid portrait treatment and its caption.
  await expect(page.getByText('Ja', { exact: true }).first()).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'ja-identity-390x844.png'), screenshot);
  await testInfo.attach('ja-identity-390x844.png', { body: screenshot, contentType: 'image/png' });

  await page.getByTestId('scrapbook-bip-cta').click();
  await expect(page).toHaveURL(/\/pages(?:\/|\?|$)/);
  await expect(page.getByText('Ja', { exact: true }).first()).toBeVisible();
});
