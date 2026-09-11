import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const EVIDENCE_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'room-canonical-display',
);

async function saveEvidence(page: Page, name: string) {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, `${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

test('Teen Room keeps one canonical companion visual with bounded interaction geometry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/room?bipDevSide=teen', { waitUntil: 'domcontentloaded' });

  const companionVisual = page.getByTestId('room-companion-visual');
  const companionHitTarget = page.getByTestId('room-companion-hit-target');
  const intentions = page.getByTestId('daily-intentions-card');
  const moodButton = page.getByRole('button', {
    name: 'Open emoji mood library',
    exact: true,
  });
  const returnButton = page.getByRole('button', {
    name: 'Open your Bip return choices',
    exact: true,
  });
  const companionButton = page.getByRole('button', {
    name: 'Suhana is here. Tap to talk.',
    exact: true,
  });

  await expect(companionVisual).toBeVisible({ timeout: 15_000 });
  await expect(companionHitTarget).toBeVisible({ timeout: 15_000 });
  await expect(intentions).toBeVisible({ timeout: 15_000 });
  await expect(moodButton).toBeVisible({ timeout: 15_000 });
  await expect(returnButton).toBeVisible({ timeout: 15_000 });
  await expect(companionVisual).toHaveCount(1);
  await expect(page.getByText(/Suhana's Room/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Suhana is nearby.', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(companionButton).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('✦ today', { exact: true })).toBeVisible();
  await expect(page.getByText('your 3 small things', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Raylene's Room/)).toHaveCount(0);
  await expect(page.getByText('Raylene is nearby.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('YOUR SANCTUARY', { exact: true })).toHaveCount(0);
  await expect(companionVisual).toHaveCSS('pointer-events', 'none');
  await expect(companionVisual).toHaveCSS('opacity', '1', { timeout: 5_000 });

  const [visualBox, tapBox, intentionsBox, moodBox, returnBox] = await Promise.all([
    companionVisual.boundingBox(),
    companionHitTarget.boundingBox(),
    intentions.boundingBox(),
    moodButton.boundingBox(),
    returnButton.boundingBox(),
  ]);
  expect(visualBox).not.toBeNull();
  expect(tapBox).not.toBeNull();
  expect(intentionsBox).not.toBeNull();
  expect(moodBox).not.toBeNull();
  expect(returnBox).not.toBeNull();
  expect(visualBox!.width).toBeGreaterThan(250);
  expect(visualBox!.height).toBeGreaterThan(400);
  expect(visualBox!.width).toBeGreaterThan(tapBox!.width);
  expect(visualBox!.height).toBeGreaterThan(tapBox!.height);
  expect(intentionsBox!.width).toBeLessThanOrEqual(118);
  expect(boxesOverlap(intentionsBox!, moodBox!)).toBe(false);
  expect(boxesOverlap(intentionsBox!, returnBox!)).toBe(false);
  expect(boxesOverlap(moodBox!, returnBox!)).toBe(false);

  await saveEvidence(page, '01-room-companion-first-composition');

  const journal = page.getByRole('button', { name: 'Journal 📖', exact: true });
  await expect(journal).toBeVisible();
  await journal.click();
  await expect(page).toHaveURL(/\/pages/);
  await page.goBack({ waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Customize your room in VibeLab', exact: true }).click();
  await expect(page.getByText('your room ✦', { exact: true })).toBeVisible();
  await expect(page.getByText("Suhana's Room", { exact: true })).toBeVisible();
  await expect(page.getByText("Sy's Room", { exact: true })).toBeVisible();
  await expect(page.getByText(/Raylene's Room/)).toHaveCount(0);
  await expect(page.getByText(/Rylane's Room/)).toHaveCount(0);

  await saveEvidence(page, '02-vibelab-room-picker-canonical-display');

  await page.getByText('💫', { exact: true }).click();
  for (const name of ['Suhana', 'Sy', 'Cloud', 'Night']) {
    await expect(page.getByText(name, { exact: true }).last()).toBeVisible();
  }
  await expect(page.getByText('raylene', { exact: true })).toHaveCount(0);
  await expect(page.getByText('rylane', { exact: true })).toHaveCount(0);

  await saveEvidence(page, '03-vibelab-companion-picker-canonical-display');
});
