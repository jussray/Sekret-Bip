import { expect, test } from '@playwright/test';

test('installs the public-safe Se’kret Bip guardrail snapshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-guardrails', 'active', { timeout: 30_000 });
  await expect(page.locator('html')).toHaveAttribute('data-product-stage', 'phased-production-readiness');

  const snapshot = await page.evaluate(() => window.__SEKRET_BIP_GUARDRAILS__);
  expect(snapshot?.version).toBe('1.1.0');
  expect(snapshot?.vision.id).toBe('private-teen-emotional-growth');
  expect(snapshot?.vision.culturalMission).toMatch(/love.*repair.*communication.*belonging.*family responsibility.*courage.*community/i);
  expect(snapshot?.vision.proofStrategy).toMatch(/creation over censorship.*measurable evidence/i);
  expect(snapshot?.privacyDefault).toBe('private');
  expect(snapshot?.parentAccessMode).toBe('verified-consent-scoped');
  expect(snapshot?.publicIdentityMode).toBe('anonymous-contextual');
  expect(snapshot?.companionClinicalRole).toBe(false);
  expect(snapshot?.durableMemoryStage).toBe('gated');
  expect(snapshot?.sensitiveFieldsIncluded).toBe(false);
  expect(snapshot?.guardrails.map(item => item.id)).toEqual(expect.arrayContaining([
    'BIP-PRIVACY-001',
    'BIP-CONSENT-001',
    'BIP-IDENTITY-001',
    'BIP-AUTH-001',
    'BIP-MEMORY-001',
    'BIP-TRUTH-001',
  ]));
});

test('public entry and auth surfaces do not render private product data or secrets', async ({ page }) => {
  for (const path of ['/', '/login', '/signup']) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|sk-[A-Za-z0-9_-]{10,}/i);
    expect(body).not.toMatch(/raw journal text|voice bip transcript|private companion chat|private character memory|unshared message content/i);
  }
});

test('public auth surfaces expose no parent surveillance or privileged controls', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('sign in to continue')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /view teen journal|open voice transcript|bypass consent|admin dashboard/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /view teen journal|open voice transcript|bypass consent/i })).toHaveCount(0);
});

test('guardrail metadata remains available at phone width without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-guardrails', 'active', { timeout: 30_000 });
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
