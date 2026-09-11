import { expect, test } from '@playwright/test';

test('teen front door leads directly into age-bucket onboarding', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(enter).toBeVisible({ timeout: 30_000 });
  await enter.click();
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i })).toBeVisible();
});

test('parent front door leads directly into parent onboarding', async ({ page }) => {
  await page.goto('/?bipDevAudience=bip-jr');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(enter).toBeVisible({ timeout: 30_000 });
  await expect(enter).toHaveAccessibleName('Bip Jr family welcome — continue to family setup');
  await enter.click();
  await expect(page).toHaveURL(/\/parent-welcome(?:\?|$)/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Create my Parent account/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /I already have an account/i })).toBeVisible();
});

test('rollback front door exposes bounded working actions and canonical identity', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen');
  await expect(page.getByTestId('web-welcome-shell')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
  await expect(page.getByText('Come on in.')).toBeVisible();
  await expect(page.getByRole('img', { name: /Night on the left, Suhana in the center, Sy on the right, Cloud, and their parents together/ })).toBeVisible();
  await expect(page.getByText('Night', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Suhana', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Sy', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-about')).toBeVisible();
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
  await expect(page.getByTestId('web-welcome-sign-in')).toBeVisible();
  await expect(page.getByTestId('web-welcome-audience-switch')).toBeVisible();
  await page.screenshot({ path: 'test-results/front-door-desktop.png', fullPage: true });
});

test('returning Teen user can reach sign in after no-session restoration', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen');
  const signIn = page.getByTestId('web-welcome-sign-in');
  await expect(signIn).toBeVisible({ timeout: 30_000 });
  await expect(signIn).toHaveAccessibleName("Sign in to your existing Se'kret Bip account");
  await signIn.click();
  await expect(page).toHaveURL(/\/login\?side=teen(?:&|$)/);
  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 15_000 });
});

test('returning Bip Jr user preserves the parent side when opening sign in', async ({ page }) => {
  await page.goto('/?bipDevAudience=bip-jr');
  const signIn = page.getByTestId('web-welcome-sign-in');
  await expect(signIn).toBeVisible({ timeout: 30_000 });
  await signIn.click();
  await expect(page).toHaveURL(/\/login\?side=parent(?:&|$)/);
  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 15_000 });
});

test('web welcome About control is keyboard accessible and reveals truthful scope', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen');
  const about = page.getByTestId('web-welcome-about');
  await expect(about).toBeVisible({ timeout: 30_000 });
  await expect(about).toHaveAccessibleName("About Se'kret Bip");
  await expect(page.getByTestId('web-welcome-about-panel')).toHaveCount(0);
  await about.focus();
  await page.keyboard.press('Enter');
  await expect(about).toHaveAccessibleName("Close About Se'kret Bip");
  await expect(page.getByTestId('web-welcome-about-panel')).toContainText('Two welcome worlds. One connected family.');
  await expect(page.getByText(/Account setup and age-appropriate permissions decide what each person can access/)).toBeVisible();
});

test('web welcome Enter supports keyboard activation', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(enter).toBeVisible({ timeout: 30_000 });
  await enter.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 15_000 });
});

test('web welcome hero safe area keeps the primary action below teen artwork', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=teen');
  const heroSafeArea = page.getByTestId('web-welcome-hero-safe-area');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(heroSafeArea).toBeVisible({ timeout: 30_000 });
  await expect(enter).toBeVisible();
  const heroBox = await heroSafeArea.boundingBox();
  const enterBox = await enter.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(enterBox).not.toBeNull();
  expect(enterBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height);
});

test('web welcome hero safe area keeps the primary action below Bip Jr artwork', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=bip-jr');
  const heroSafeArea = page.getByTestId('web-welcome-hero-safe-area');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible({ timeout: 30_000 });
  const heroBox = await heroSafeArea.boundingBox();
  const enterBox = await enter.boundingBox();
  expect(heroBox).not.toBeNull();
  expect(enterBox).not.toBeNull();
  expect(enterBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height);
});

test('frontend entry renders at phone width without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=teen');
  const enter = page.getByTestId('web-welcome-enter');
  await expect(enter).toBeVisible({ timeout: 30_000 });
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
  const box = await enter.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/front-door-390x844.png', fullPage: true });
});

test('frontend entry remains contained on a short narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?bipDevAudience=teen');
  const shell = page.getByTestId('web-welcome-shell');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
  const shellBox = await shell.boundingBox();
  expect(shellBox).not.toBeNull();
  expect(shellBox!.x).toBeGreaterThanOrEqual(0);
  expect(shellBox!.x + shellBox!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'test-results/front-door-320x568.png', fullPage: true });
});

test('frontend entry remains contained at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/?bipDevAudience=bip-jr');
  const shell = page.getByTestId('web-welcome-shell');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  const shellBox = await shell.boundingBox();
  expect(shellBox).not.toBeNull();
  expect(shellBox!.width).toBeLessThanOrEqual(430);
  expect(shellBox!.x).toBeGreaterThanOrEqual(0);
  expect(shellBox!.x + shellBox!.width).toBeLessThanOrEqual(768);
  await page.screenshot({ path: 'test-results/front-door-tablet-768x1024.png', fullPage: true });
});

test('web welcome remains stable when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?bipDevAudience=teen');
  const shell = page.getByTestId('web-welcome-shell');
  await expect(shell).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
  const activeMotion = await shell.evaluate(element => {
    const nodes = [element, ...Array.from(element.querySelectorAll('*'))];
    return nodes.flatMap(node => {
      const style = window.getComputedStyle(node);
      const hasAnimation = style.animationName !== 'none'
        && style.animationDuration.split(',').some(value => Number.parseFloat(value) > 0);
      const hasTransition = style.transitionDuration
        .split(',')
        .some(value => Number.parseFloat(value) > 0);
      return hasAnimation || hasTransition
        ? [{ tag: node.tagName, animation: style.animationName, animationDuration: style.animationDuration, transitionDuration: style.transitionDuration }]
        : [];
    });
  });
  expect(activeMotion).toEqual([]);
});

test('login deep link renders current controls and survives refresh', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
});

test('teen signup deep link enforces age assurance before account fields', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).not.toBeVisible();
});

test('parent signup deep link exposes accessible account creation controls', async ({ page }) => {
  await page.goto('/signup?side=parent');
  await expect(page.getByText('create your Parent Space')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show password', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show password confirmation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
});

test('protected teen routes remain behind the public boundary', async ({ page }) => {
  await page.goto('/circle?bipDevAudience=teen');
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('🌐 Circle')).not.toBeVisible();
});

test('authorization evidence and secrets stay out of the public surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible({ timeout: 30_000 });
  const visibleText = await page.locator('body').innerText();
  for (const forbidden of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'ACCOUNT_DELETION_PROCESS_SECRET',
    'SAFETY_SCAN_SECRET',
    'app_private_config',
    'authorization_phase0.sql',
    'supabase-authorization-baseline.json',
  ]) {
    expect(visibleText).not.toContain(forbidden);
  }
});
