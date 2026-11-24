import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 320, height: 568, name: 'small-phone' },
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
]) {
  test(`approved Family front door loads real artwork and safe introductions on ${viewport.name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

    const hero = page.getByTestId('web-welcome-hero-teen');
    await expect(hero).toBeVisible();
    const phone = viewport.width < 520;
    // React Native Web's Image renders an accessible div with nested/CSS image
    // content, not necessarily an HTML <img> with a src attribute.
    const expectedMediaId = phone
      ? '207db92c-7f3b-45d3-9534-cd9a7cd2b6fe'
      : '1c462922-24b6-4984-89aa-826dc36c62f8';
    const getResolvedImage = async () => hero.evaluate((element, mediaId) => {
      const nodes = [element, ...Array.from(element.querySelectorAll('*'))];
      for (const node of nodes) {
        const src = node.getAttribute('src');
        if (src?.includes(mediaId)) return src;
        const css = getComputedStyle(node).backgroundImage;
        const match = css.match(/url\(["']?([^"')]+)["']?\)/);
        if (match?.[1]?.includes(mediaId)) return match[1];
      }
      return '';
    }, expectedMediaId);
    await expect.poll(getResolvedImage, {
      timeout: 15_000,
      message: 'Approved canon must be the image actually rendered by the browser',
    }).toContain(expectedMediaId);
    const imageUrl = await getResolvedImage();
    const imageWidth = await page.evaluate(async url => {
      const probe = new Image();
      probe.src = url;
      await probe.decode();
      return probe.naturalWidth;
    }, imageUrl);
    expect(imageWidth).toBeGreaterThan(0);

    if (phone) {
      // A portrait must fill an appreciable part of the initial viewport.
      // A miniature 5-column poster or empty spacer is an explicit failure.
      const box = await hero.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(180);
      expect(box!.height).toBeGreaterThan(260);
      expect(box!.y).toBeLessThan(viewport.height * 0.47);
      await expect(page.getByTestId('web-welcome-hero-safe-area')).toHaveCount(0);
    }

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
