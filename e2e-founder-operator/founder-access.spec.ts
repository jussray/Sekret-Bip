import { expect, test, type Page } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://founder-operator-test.supabase.co';
const STORAGE_KEY = 'sb-founder-operator-test-auth-token';
const USER_ID = '00000000-0000-4000-8000-000000000616';
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDA2MTYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo0MTAyNDQ0ODAwfQ.test-signature';

const user = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'founder-browser-proof@example.invalid',
  email_confirmed_at: '2026-07-24T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-07-24T00:00:00.000Z',
  last_sign_in_at: '2026-07-24T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-07-24T00:00:00.000Z',
  updated_at: '2026-07-24T00:00:00.000Z',
  is_anonymous: false,
};

const session = {
  access_token: ACCESS_TOKEN,
  token_type: 'bearer',
  expires_in: 2_147_483_647,
  expires_at: 4_102_444_800,
  refresh_token: 'founder-operator-browser-proof-refresh-token',
  user,
};

type Profile = {
  user_id: string;
  email: string;
  role: string;
  can_view_audits: boolean;
  can_manage_app: boolean;
  exclude_from_analytics: boolean;
};

async function installFakeSession(page: Page, profile: Profile) {
  let interceptedRequests = 0;

  await page.addInitScript(
    ({ storageKey, storedSession }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(storedSession));
    },
    { storageKey: STORAGE_KEY, storedSession: session },
  );

  await page.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    interceptedRequests += 1;
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
      return;
    }

    if (url.pathname.endsWith('/rest/v1/app_profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': '0-0/1' },
        body: JSON.stringify(profile),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  return () => interceptedRequests;
}

test.describe('Founder Operator access boundary', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('verified founder profile opens the Founder Operator surface', async ({ page }, testInfo) => {
    const interceptedCount = await installFakeSession(page, {
      user_id: USER_ID,
      email: user.email,
      role: 'founder',
      can_view_audits: true,
      can_manage_app: true,
      exclude_from_analytics: true,
    });

    await page.goto('/control-room');

    await expect(page.getByText('FOUNDER CONTROL ROOM', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Founder Operator', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Operator', exact: true })).toBeVisible();
    await expect(page.getByText('Developer tools locked', { exact: true })).toHaveCount(0);
    expect(interceptedCount()).toBeGreaterThan(0);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('founder-open.png'), fullPage: true });
  });

  test('non-founder profile remains locked out of every Control Room surface', async ({ page }, testInfo) => {
    const interceptedCount = await installFakeSession(page, {
      user_id: USER_ID,
      email: user.email,
      role: 'teen',
      can_view_audits: false,
      can_manage_app: false,
      exclude_from_analytics: false,
    });

    await page.goto('/control-room');

    await expect(page.getByText('Developer tools locked', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Back to Bip', exact: true })).toBeVisible();
    await expect(page.getByText('Founder Operator', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Operations', exact: true })).toHaveCount(0);
    expect(interceptedCount()).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath('non-founder-locked.png'), fullPage: true });
  });
});