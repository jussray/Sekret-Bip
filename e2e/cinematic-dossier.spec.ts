import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

const ARTIFACT_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'cinematic-dossier',
);

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(metrics.html, metrics.body)).toBeLessThanOrEqual(metrics.viewport + 1);
}

async function expectRenderedImagesDecoded(targets: Locator, label: string) {
  const unloaded = await targets.evaluateAll(nodes =>
    nodes.flatMap(node => {
      const image = node instanceof HTMLImageElement ? node : node.querySelector('img');
      if (!image) return [{ src: null, complete: null, reason: 'no rendered img descendant' }];
      if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) return [];
      return [{
        src: image.currentSrc || image.src || null,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      }];
    }),
  );

  expect(unloaded, `Unloaded ${label}: ${JSON.stringify(unloaded)}`).toEqual([]);
}

async function expectDossierMediaTruth(page: Page) {
  const scenes = page.locator('[data-testid$="-scene"]');
  const characters = page.locator('[data-testid$="-character"]');
  const pendingPoses = page.locator('[data-testid$="-pose-pending"]');

  await expect(scenes).toHaveCount(8);
  await expect(characters).toHaveCount(2);
  await expect(pendingPoses).toHaveCount(6);

  await expectRenderedImagesDecoded(scenes, 'dossier scene images');
  await expectRenderedImagesDecoded(characters, 'dossier canonical character images');
}

for (const viewport of VIEWPORTS) {
  test(`Night cinematic evidence dossier renders on ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/cinematic-dossier', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('cinematic-dossier-screen')).toBeVisible();
    await expect(page.getByTestId('cinematic-evidence-board')).toBeVisible();
    await expect(page.getByTestId('cinematic-dossier-hero')).toBeVisible();
    await expect(page.getByTestId('cinematic-shot-01')).toBeVisible();
    await expect(page.getByTestId('cinematic-shot-07')).toBeVisible();
    await expect(page.getByTestId('cinematic-module-1')).toBeVisible();
    await expect(page.getByTestId('cinematic-module-2')).toBeVisible();
    await expect(page.getByTestId('cinematic-module-3')).toBeVisible();
    await expect(page.getByTestId('cinematic-truth-strip')).toContainText('NIGHT VERTICAL SLICE');
    await expect(page.getByTestId('cinematic-truth-strip')).toContainText('CANONICAL NIGHT REGISTRY');
    await expect(page.getByText('FALLBACK → NEUTRAL · listening', { exact: true })).toBeVisible();
    await expect(page.getByText('GENERATED · neutral', { exact: true })).toBeVisible();

    await expectDossierMediaTruth(page);
    await expectNoHorizontalOverflow(page);

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const filename = `cinematic-dossier-${viewport.name}.png`;
    await fs.writeFile(path.join(ARTIFACT_DIR, filename), screenshot);
    await testInfo.attach(filename, { body: screenshot, contentType: 'image/png' });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
}
