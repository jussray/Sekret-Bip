import { expect, test } from '@playwright/test';

// One family scene must work at each viewport, not just one cropped child card.
for (const viewport of [
  { width: 320, height: 568, name: 'small-phone' },
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
]) {
  test(`entire canon family shares one front door on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

    const composition = page.getByTestId('family-composition');
    await expect(composition).toBeVisible();
    const box = await composition.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(viewport.width < 520 ? viewport.width * 0.83 : 780);
    expect(box!.height).toBeGreaterThan(viewport.width < 520 ? 270 : 450);

    const ids = ['dad','mom','sy','night','suhana','cloud','bip-jr-1','bip-jr-2','bip-jr-3','bip-jr-4'];
    const names = ['Dad','Mom','Sy','Night','Suhana','Cloud','Bip Jr. 1','Bip Jr. 2','Bip Jr. 3','Bip Jr. 4'];
    for (const [i,id] of ids.entries()) {
      const member = page.getByTestId(`family-member-${id}`);
      await expect(member).toHaveCount(1);
      await expect(member).toHaveAccessibleName(new RegExp(`Meet ${names[i]},`));
    }
    await expect(page.getByTestId('family-member-ja')).toHaveCount(0);
    await expect(page.getByTestId('canon-companion-scroll')).toHaveCount(0);
    await expect(page.getByTestId('web-welcome-hero-safe-area')).toHaveCount(0);

    // Check that the actual approved Sy crop is loaded rather than a substitute.
    const sy = page.getByTestId('web-welcome-hero-teen');
    await expect(sy).toBeVisible();
    await expect.poll(async () => sy.evaluate(el => {
      const nodes=[el,...Array.from(el.querySelectorAll('*'))];
      return nodes.some(node => (node.getAttribute('src') ?? '').includes('29437f93-1125-4709-b45d-96adbfa6373d')
          || getComputedStyle(node).backgroundImage.includes('29437f93-1125-4709-b45d-96adbfa6373d'));
    }), { timeout: 15_000 }).toBe(true);

    await page.getByTestId('family-member-bip-jr-2').click();
    await expect(page.getByTestId('canon-companion-detail')).toContainText('Bip Jr. 2 · The Giggle');
    await page.getByTestId('canon-companion-close').click();
    await expect(page.getByTestId('canon-companion-detail')).toHaveCount(0);

    await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await testInfo.attach(`family-front-door-${viewport.name}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}

test('Bip Jr welcome and parent entry remain isolated from public family hero', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
  await expect(page.getByTestId('family-composition')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter')).toHaveAccessibleName(
    'Bip Jr family welcome — continue to family setup',
  );
});
