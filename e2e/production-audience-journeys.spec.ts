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
