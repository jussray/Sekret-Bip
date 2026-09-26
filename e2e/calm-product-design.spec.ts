import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

const COMPANIONS = [
  { key: 'raylene', label: 'Suhana', emoji: '💜' },
  { key: 'rylane', label: 'Sy', emoji: '⚡' },
  { key: 'cloud', label: 'Cloud', emoji: '☁️' },
  { key: 'night', label: 'Night', emoji: '🌙' },
] as const;

async function seedTeenCompanion(page: Page, companion: string) {
  await page.addInitScript(value => {
    window.localStorage.setItem('userSide', 'teen');
    window.localStorage.setItem('selectedSekret', value);
  }, companion);
}

async function readMotion(locator: Locator) {
  return locator.evaluate(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      transform: style.transform,
      opacity: Number.parseFloat(style.opacity),
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });
}

for (const companion of COMPANIONS) {
  test(`Calm static witness presents ${companion.label} without changing the stored companion id`, async ({ page }, testInfo: TestInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(VIEWPORTS[0]);
    await seedTeenCompanion(page, companion.key);
    await page.goto('/calm?bipDevSide=teen', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('calm-presence-pill')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`${companion.label}'s here · weighted blanket mode`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${companion.label} says ${companion.emoji}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Calm Tools ✦', { exact: true })).toBeVisible();

    await testInfo.attach(`calm-${companion.key}-identity.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}

for (const viewport of VIEWPORTS) {
  test(`Calm ambient motion holds still with reduced motion on ${viewport.name}`, async ({ page }, testInfo: TestInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedTeenCompanion(page, 'night');
    await page.goto('/calm?bipDevSide=teen', { waitUntil: 'networkidle' });

    const pill = page.getByTestId('calm-presence-pill');
    const greeting = page.getByTestId('calm-greeting-card');
    const breathe = page.getByTestId('calm-breathe-pulse');

    await expect(pill).toBeVisible({ timeout: 15_000 });
    await expect(greeting).toBeVisible({ timeout: 15_000 });
    await breathe.scrollIntoViewIfNeeded();
    await expect(breathe).toBeVisible({ timeout: 15_000 });

    const first = await Promise.all([pill, greeting, breathe].map(readMotion));
    await page.waitForTimeout(700);
    const second = await Promise.all([pill, greeting, breathe].map(readMotion));

    first.forEach((sample, index) => {
      const next = second[index];
      expect(next.transform).toBe(sample.transform);
      expect(Math.abs(next.opacity - sample.opacity)).toBeLessThanOrEqual(0.001);
      for (const key of ['top', 'left', 'width', 'height'] as const) {
        expect(Math.abs(next[key] - sample[key])).toBeLessThanOrEqual(0.5);
      }
    });

    await testInfo.attach(`calm-${viewport.name}-reduced-motion.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}
