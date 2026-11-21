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
  await expect(page.getByText("Sy's room", { exact: true })).toBeVisible();
  await expect(page.getByTestId('room-production-art')).toBeVisible();
  await expect(page.getByTestId('room-wall-scrapbook')).toBeVisible();
  const syActor = page.getByTestId('scrapbook-sy-actor');
  await expect(syActor).toBeVisible();
  const syActorBox = await syActor.boundingBox();
  expect(syActorBox, 'Sy portrait must have measurable height').not.toBeNull();
  expect(syActorBox!.height).toBeGreaterThanOrEqual(260);
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
  // Verify actual Pages artwork, not the inaccurate human Cloud in the mockup.
  await expect(page.getByTestId('pages-sy-boy-portrait')).toBeVisible();
  await expect(page.getByTestId('pages-cloud-sprite')).toBeVisible();
  await expect(page.getByTestId('pages-cloud-aura')).toBeVisible();
  await expect(page.getByTestId('pages-ja-card-star')).toBeVisible();
  await expect(page.getByTestId('pages-night-journal-backdrop')).toBeVisible();
  const syCardBox = await page.getByTestId('pages-companion-card-rylane').boundingBox();
  expect(syCardBox, 'Sy card should be present').not.toBeNull();
  expect(syCardBox!.height).toBeLessThanOrEqual(145);
  const pagesPortraitWitness = await page.screenshot({ fullPage: false, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'pages-five-companions-390x844.png'), pagesPortraitWitness);
  await testInfo.attach('pages-five-companions-390x844.png', {
    body: pagesPortraitWitness,
    contentType: 'image/png',
  });
});

test('Cloud glow is rendered in the real scrapbook browser scene at 390x844', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=cloud', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('scrapbook-companion-scene');
  const aura = page.getByTestId('scrapbook-cloud-aura');
  await expect(scene).toBeVisible({ timeout: 15_000 });
  await expect(aura).toBeVisible();
  await expect(aura).toHaveCSS('background-color', 'rgba(123, 216, 255, 0.27)');
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
  // Ja keeps the existing approved symbolic fallback; no invented actor.
  await expect(page.getByText('Ja', { exact: true }).first()).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await fs.mkdir(VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(VISUAL_DIR, 'ja-identity-390x844.png'), screenshot);
  await testInfo.attach('ja-identity-390x844.png', { body: screenshot, contentType: 'image/png' });

  await page.getByTestId('scrapbook-bip-cta').click();
  await expect(page).toHaveURL(/\/pages(?:\/|\?|$)/);
  await expect(page.getByText('Ja', { exact: true }).first()).toBeVisible();
});


for (const viewport of [{ width: 320, height: 640 }, { width: 1440, height: 900 }]) {
  test(`scrapbook companion art and actions fit ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=sy', { waitUntil: 'domcontentloaded' });
    const scene = page.getByTestId('scrapbook-companion-scene');
    const roomArt = page.getByTestId('room-production-art');
    const wall = page.getByTestId('room-wall-scrapbook');
    const actor = page.getByTestId('scrapbook-sy-actor');
    const action = page.getByTestId('scrapbook-bip-cta');
    await expect(scene).toBeVisible({ timeout: 15_000 });
    await expect(actor).toBeVisible();
    await expect(action).toBeVisible();
    await expect(roomArt).toBeVisible();
    await expect(wall).toBeVisible();
    const wallBox = await wall.boundingBox();
    const actorBox = await actor.boundingBox();
    const actionBox = await action.boundingBox();
    expect(wallBox).not.toBeNull();
    expect(actorBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(wallBox!.y).toBeGreaterThanOrEqual(0);
    expect(wallBox!.y + wallBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(actorBox!.width).toBeGreaterThan(0);
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    await testInfo.attach(`scrapbook-${viewport.width}x${viewport.height}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}


test('Suhana and Night live in their own room art with distinct changing wall notes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(Date.prototype, 'getHours', { configurable: true, value: () => 18 });
  });
  for (const [companion, expected] of [
    ['suhana', 'you showed up for yourself today.'],
    ['night', 'the day can end without every answer.'],
  ] as const) {
    await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=' + companion, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('room-production-art')).toBeVisible();
    await expect(page.getByTestId('room-wall-message')).toHaveText(expected);
    await expect(page.getByTestId('scrapbook-room-companion')).toBeVisible();
    const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
    await fs.mkdir(VISUAL_DIR, { recursive: true });
    await fs.writeFile(path.join(VISUAL_DIR, companion + '-evening-room-390x844.png'), shot);
    await testInfo.attach(companion + '-evening-room.png', { body: shot, contentType: 'image/png' });
  }
});

test('wall sayings change with real room phase without replacing scene or character', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(Date.prototype, 'getHours', { configurable: true, value: () => 12 });
  });
  await page.goto('/scrapbook-check-in?bipDevSide=teen&companion=sy', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('room-wall-phase')).toHaveText('MIDDAY CHECK-IN');
  await expect(page.getByTestId('room-wall-message')).toHaveText('you can reset the play.');
  await expect(page.getByTestId('room-production-art')).toBeVisible();
});
