import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

async function expectCleanPage(page: import('@playwright/test').Page, run: () => Promise<void>) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  await run();
  expect(pageErrors, `Uncaught page errors: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
}

test('production Teen journey reaches age-gated onboarding without a write', async ({ page }, testInfo) => {
  await expectCleanPage(page, async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('web-welcome-enter').click();
    await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
    await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i })).toBeVisible();
    await testInfo.attach('production-teen-journey.png', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  });
});

test('production Bip Jr journey hands off to the parent-controlled entry without a write', async ({ page }, testInfo) => {
  await expectCleanPage(page, async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('YOUR FAMILY. YOUR SPACE.', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('web-welcome-enter').click();
    await expect(page).toHaveURL(/\/parent-welcome(?:\?|$)/);
    await expect(page.getByRole('button', { name: 'Create my Parent account' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'I already have an account' })).toBeVisible({ timeout: 30_000 });
    await expectNoHorizontalOverflow(page);
    await testInfo.attach('production-bip-jr-journey.png', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  });
});

test('production Parent journey reaches sign-in and keeps approvals protected', async ({ page }, testInfo) => {
  await expectCleanPage(page, async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'networkidle' });
    await page.getByTestId('web-welcome-enter').click();
    await expect(page).toHaveURL(/\/parent-welcome(?:\?|$)/);
    await page.getByRole('button', { name: 'I already have an account' }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible({ timeout: 30_000 });
    await page.goto('/approvals', { waitUntil: 'networkidle' });
    await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('To Review')).not.toBeVisible();
    await testInfo.attach('production-parent-protected-journey.png', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  });
});


/**
 * Read-only release witnesses. These screenshots are review artifacts, not
 * automatic visual approval or proof that authenticated logout works.
 * Production remains governed by its separately verified Cloudflare release.
 */
for (const viewport of [
  { name: 'small-phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const) {
  test(`production welcome and login remain usable on ${viewport.name}`, async ({ page }, testInfo) => {
    const failedAssets: string[] = [];
    page.on('response', response => {
      if (
        response.status() >= 400 &&
        /\.(?:png|jpe?g|webp|svg|gif|woff2?)(?:[?#]|$)/i.test(response.url())
      ) {
        failedAssets.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });

    await expectCleanPage(page, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });

      const hero = page.getByTestId('web-welcome-hero-teen');
      const enter = page.getByTestId('web-welcome-enter');
      await expect(hero).toBeVisible({ timeout: 30_000 });
      await expect(enter).toBeVisible();
      await expectNoHorizontalOverflow(page);

      // The hero must remain rendered and within the horizontal viewport,
      // even at a narrow device width. The screenshot is the crop-quality witness.
      const heroBounds = await hero.boundingBox();
      expect(heroBounds).not.toBeNull();
      expect(heroBounds!.width).toBeGreaterThan(0);
      expect(heroBounds!.x).toBeGreaterThanOrEqual(-1);
      expect(heroBounds!.x + heroBounds!.width).toBeLessThanOrEqual(viewport.width + 1);

      const entryBounds = await enter.boundingBox();
      expect(entryBounds).not.toBeNull();
      expect(entryBounds!.height).toBeGreaterThanOrEqual(40);
      expect(entryBounds!.width).toBeGreaterThanOrEqual(40);

      await testInfo.attach(`welcome-${viewport.name}.png`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });

      // A short phone may place entry below the first viewport. Its scroll
      // container must bring the existing control fully on screen.
      const audienceSwitch = page.getByTestId('web-welcome-audience-switch');
      await audienceSwitch.scrollIntoViewIfNeeded();
      const switchBounds = await audienceSwitch.boundingBox();
      expect(switchBounds).not.toBeNull();
      expect(switchBounds!.height).toBeGreaterThanOrEqual(44);
      expect(switchBounds!.y).toBeGreaterThanOrEqual(-1);
      expect(switchBounds!.y + switchBounds!.height).toBeLessThanOrEqual(viewport.height + 1);

      await enter.scrollIntoViewIfNeeded();
      const visibleEntryBounds = await enter.boundingBox();
      expect(visibleEntryBounds).not.toBeNull();
      expect(visibleEntryBounds!.y).toBeGreaterThanOrEqual(-1);
      expect(visibleEntryBounds!.y + visibleEntryBounds!.height).toBeLessThanOrEqual(viewport.height + 1);

      await testInfo.attach(`welcome-entry-revealed-${viewport.name}.png`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });

      // Follow the existing public entry path, without submitting credentials.
      await enter.click();
      await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
      await page.goto('/login', { waitUntil: 'networkidle' });
      await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
      await expectNoHorizontalOverflow(page);
      await testInfo.attach(`login-${viewport.name}.png`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });
    });

    expect(failedAssets, `Broken image/font assets at ${viewport.name}`).toEqual([]);
  });
}
