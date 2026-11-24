import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
]) {
  test(`approved Family front door loads real artwork and safe introductions on ${viewport.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

    const hero = page.getByTestId('web-welcome-hero-teen');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute('src', /1c462922-24b6-4984-89aa-826dc36c62f8\.jpg/);
    await expect.poll(() => hero.evaluate((element) => (element as HTMLImageElement).naturalWidth), {
      timeout: 15_000,
      message: 'Exact founder-approved poster must load, not a broken CDN image',
    }).toBeGreaterThan(0);

    const gallery = page.getByTestId('canon-companion-showcase');
    await expect(gallery).toBeVisible();
    await expect(page.getByTestId('canon-companion-select')).toHaveCount(5);
    const cards = page.getByTestId('canon-companion-select');
    for (const [index, name] of ['Sy', 'Night', 'Suhana', 'Ja', 'Cloud'].entries()) {
      await expect(cards.nth(index)).toHaveAccessibleName(new RegExp(`Meet ${name},`));
    }

    await cards.nth(3).click();
    await expect(page.getByTestId('canon-companion-detail')).toContainText('Ja · The Oracle');
    await expect(page.getByTestId('canon-companion-continue')).toBeVisible();
    await page.getByTestId('canon-companion-close').click();
    await expect(page.getByTestId('canon-companion-detail')).toHaveCount(0);

    await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
  });
}

test('Bip Jr remains independent from the Teen canon gallery', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
  await expect(page.getByTestId('canon-companion-showcase')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter')).toHaveAccessibleName(
    'Bip Jr family welcome — continue to family setup',
  );
});
