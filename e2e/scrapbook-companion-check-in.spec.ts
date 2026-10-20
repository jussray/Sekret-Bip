import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const VISUAL_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'scrapbook-companion-check-in',
);

test('approved Sy evening scrapbook check-in renders at 390x844 and hands off to Sy in Pages', async ({ page }, testInfo) => {
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
  await expect(page.getByText("SE'KRET PAGES", { exact: true })).toBeVisible();
  await expect(page.getByText('Sy', { exact: true }).first()).toBeVisible();

  // The handoff query is one-shot: Pages consumes it so normal companion tabs
  // are not pinned back to Sy after arrival.
  await expect.poll(() => new URL(page.url()).searchParams.get('companion') ?? '').toBe('');
});


test('Sy scrapbook scene stays usable on a compact 320x568 phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
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
  const note = page.getByText('you made it through today.', { exact: true });
  const cta = page.getByTestId('scrapbook-bip-cta');

  await expect(scene).toBeVisible({ timeout: 15_000 });
  await expect(note).toBeVisible();
  await expect(cta).toBeVisible();

  const bounds = await page.evaluate(() => {
    const sceneEl = document.querySelector('[data-testid="scrapbook-companion-scene"]');
    const ctaEl = document.querySelector('[data-testid="scrapbook-bip-cta"]');
    if (!sceneEl || !ctaEl) return null;
    const sceneRect = sceneEl.getBoundingClientRect();
    const ctaRect = ctaEl.getBoundingClientRect();
    return {
      sceneRight: sceneRect.right,
      ctaBottom: ctaRect.bottom,
      ctaTop: ctaRect.top,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(bounds).not.toBeNull();
  expect(bounds!.sceneRight).toBeLessThanOrEqual(bounds!.viewportWidth + 1);
  expect(bounds!.ctaBottom).toBeLessThanOrEqual(bounds!.viewportHeight + 1);
  expect(bounds!.ctaTop).toBeGreaterThan(0);

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'sy-evening-320x568.png'), screenshot);
  await testInfo.attach('sy-evening-320x568.png', {
    body: screenshot,
    contentType: 'image/png',
  });
});
