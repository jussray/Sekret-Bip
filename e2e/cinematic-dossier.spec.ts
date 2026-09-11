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
  const unloaded = await targets.evaluateAll(nodes => {
    const failures: Array<{
      src: string | null;
      complete: boolean | null;
      naturalWidth: number | null;
      naturalHeight: number | null;
      reason: string | null;
    }> = [];

    for (const node of nodes) {
      const image = node instanceof HTMLImageElement ? node : node.querySelector('img');
      if (!image) {
        failures.push({
          src: null,
          complete: null,
          naturalWidth: null,
          naturalHeight: null,
          reason: 'no rendered img descendant',
        });
        continue;
      }

      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        failures.push({
          src: image.currentSrc || image.src || null,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          reason: 'rendered img did not decode',
        });
      }
    }

    return failures;
  });

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
    const board = page.getByTestId('cinematic-evidence-board');
    await expect(board).toBeVisible();
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

    const viewportScreenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const viewportFilename = `cinematic-dossier-${viewport.name}.png`;
    await fs.writeFile(path.join(ARTIFACT_DIR, viewportFilename), viewportScreenshot);
    await testInfo.attach(viewportFilename, { body: viewportScreenshot, contentType: 'image/png' });

    const boardScreenshot = await board.screenshot({ animations: 'disabled' });
    const boardFilename = `cinematic-dossier-board-${viewport.name}.png`;
    await fs.writeFile(path.join(ARTIFACT_DIR, boardFilename), boardScreenshot);
    await testInfo.attach(boardFilename, { body: boardScreenshot, contentType: 'image/png' });

    expect(pageErrors, `Uncaught page errors: ${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
  });
}
