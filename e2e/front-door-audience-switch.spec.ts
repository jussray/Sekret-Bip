import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    htmlClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));
  const viewportWidth = Math.min(
    metrics.innerWidth,
    metrics.htmlClientWidth,
    metrics.bodyClientWidth || metrics.innerWidth,
  );
  expect(Math.max(metrics.htmlScrollWidth, metrics.bodyScrollWidth)).toBeLessThanOrEqual(viewportWidth + 1);
}

test('caveman visual teaches the doorway, stays contained, then clears for interaction', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 320, height: 568 });
  // Capture the short-lived primer on animation frames. Sequential expect() polls
  // can race its intentional unmount and misreport a complete animation as absent.
  await page.addInitScript(() => {
    type PrimerFrame = { text: string; label: string | null; x: number; right: number };
    const evidence = window as typeof window & { __bipPrimerFrames?: PrimerFrame[] };
    evidence.__bipPrimerFrames = [];
    let count = 0;
    const sample = () => {
      const element = document.querySelector<HTMLElement>('[data-testid="web-welcome-caveman-visual"]');
      if (element) {
        const box = element.getBoundingClientRect();
        evidence.__bipPrimerFrames!.push({
          text: element.textContent || '',
          label: element.getAttribute('aria-label'),
          x: box.x,
          right: box.right,
        });
      }
      if (++count < 360) window.requestAnimationFrame(sample);
    };
    window.requestAnimationFrame(sample);
  });
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('web-welcome-scene-settled')).toBeAttached({ timeout: 10_000 });

  const frames = await page.evaluate(() => (
    window as typeof window & {
      __bipPrimerFrames?: Array<{ text: string; label: string | null; x: number; right: number }>;
    }
  ).__bipPrimerFrames || []);
  expect(frames.length, 'primer appeared during the animated introduction').toBeGreaterThan(0);
  expect(frames.some(frame => frame.label === 'You. Your space. Enter.')).toBe(true);
  expect(frames.some(frame =>
    frame.text.includes('YOU') && frame.text.includes('YOUR SPACE') && frame.text.includes('ENTER'),
  )).toBe(true);
  expect(frames.some(frame => frame.x >= -1 && frame.right <= 321)).toBe(true);
  await expect(page.getByTestId('web-welcome-caveman-visual')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
  await expectNoDocumentHorizontalOverflow(page);
});

for (const viewport of VIEWPORTS) {
  test(`public front door switches one audience at a time on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });

    await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expect(page.getByText("I'm Teen", { exact: true })).toHaveCount(0);
    await expect(page.getByText('I’m a Parent / Guardian', { exact: true })).toHaveCount(0);
    await expectNoDocumentHorizontalOverflow(page);

    const audienceSwitch = page.getByTestId('web-welcome-audience-switch');
    await expect(audienceSwitch).toHaveAccessibleName('Switch to the Bip Jr and Family welcome');
    await audienceSwitch.click();

    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-teen')).toHaveCount(0);
    await expect(page.getByText('YOUR FAMILY. YOUR SPACE.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bip Jr family welcome — continue to family setup' })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);

    await expect(audienceSwitch).toHaveAccessibleName("Switch to the Se'kret Bip Teen welcome");
    await audienceSwitch.click();

    await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toHaveCount(0);
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);

    await testInfo.attach(`front-door-audience-switch-${viewport.name}.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}
