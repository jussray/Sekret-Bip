import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const controlledEmail = process.env.SEKRET_CONTROLLED_ACCOUNT_EMAIL?.trim();
const controlledPassword = process.env.SEKRET_CONTROLLED_ACCOUNT_PASSWORD?.trim();
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA?.trim().toLowerCase();
const SENTINEL = 'CI_ACCOUNT_A_PRIVATE_CACHE_SENTINEL';
const SENTINEL_ENTRY_ID = 99119911;
const PRIVATE_CACHE_KEYS = ['entries', 'circlePosts', 'roomMemory', 'teen_profile_data'];
const DURABLE_TABLES = new Set([
  'journal_entries',
  'mood_history',
  'voice_notes',
  'comfort_sessions',
  'room_memory',
  'period_days',
]);

async function signInTeen(page: Page) {
  test.skip(!controlledEmail, 'SEKRET_CONTROLLED_ACCOUNT_EMAIL is required.');
  test.skip(!controlledPassword, 'SEKRET_CONTROLLED_ACCOUNT_PASSWORD is required.');

  await page.goto('/login?side=teen');
  await page.getByPlaceholder('Phone number, username or email').fill(controlledEmail!);
  await page.getByPlaceholder('Password').fill(controlledPassword!);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => null);

  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(`Controlled account sign in failed: ${await alert.textContent()}`);
  }

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
}

function tableFromRequestUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const marker = '/rest/v1/';
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const table = url.pathname.slice(index + marker.length).split('/')[0];
    return DURABLE_TABLES.has(table) ? table : null;
  } catch {
    return null;
  }
}

function writeReceipt(value: Record<string, unknown>) {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(
    'artifacts/controlled-account-session-continuity.json',
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

test('controlled account clears mounted and device-private state on logout, then rehydrates durable state after relogin', async ({ page }) => {
  test.setTimeout(150_000);
  test.skip(!expectedHeadSha, 'EXPECTED_HEAD_SHA is required for exact-production proof.');

  await signInTeen(page);

  await page.evaluate(({ sentinel, entryId, privateKeys }) => {
    localStorage.setItem('entries', JSON.stringify([{
      id: entryId,
      text: sentinel,
      mood: 'okay',
      date: '9/18/2026',
      time: '9:00 PM',
      source: 'me',
      activeTab: 'me',
      entryMode: 'typed',
    }]));
    localStorage.setItem('circlePosts', JSON.stringify([{ id: 99119912, text: sentinel }]));
    localStorage.setItem('roomMemory', JSON.stringify({ lastHotspot: sentinel }));
    localStorage.setItem('teen_profile_data', JSON.stringify({ displayName: sentinel, gender: 'girl' }));
    for (const key of privateKeys) {
      if (!localStorage.getItem(key)) throw new Error(`Failed to seed private cache key ${key}`);
    }
  }, { sentinel: SENTINEL, entryId: SENTINEL_ENTRY_ID, privateKeys: PRIVATE_CACHE_KEYS });

  // Force the signed-in app to hydrate the synthetic device cache into mounted
  // state before logout. Otherwise a storage-only test could falsely pass.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.goto(`/pages/${SENTINEL_ENTRY_ID}`);
  await expect(page.getByText(SENTINEL, { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto('/logout');
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });

  await expect.poll(async () => page.evaluate(
    (keys) => keys.every(key => localStorage.getItem(key) === null),
    PRIVATE_CACHE_KEYS,
  ), { timeout: 30_000 }).toBe(true);

  const durableReads = new Set<string>();
  page.on('request', request => {
    const table = tableFromRequestUrl(request.url());
    if (table) durableReads.add(table);
  });

  await signInTeen(page);
  await page.goto('/room?bipDevAudience=teen');
  await expect(page.getByRole('button', { name: /is here\. Tap to talk\./i }).first()).toBeVisible({ timeout: 45_000 });

  await expect.poll(() => durableReads.size, {
    message: 'Expected at least one account-scoped durable data read after relogin.',
    timeout: 45_000,
  }).toBeGreaterThan(0);

  await page.goto(`/pages/${SENTINEL_ENTRY_ID}`);
  await expect(page.getByText(SENTINEL, { exact: true })).toHaveCount(0);

  const visibleBody = await page.locator('body').innerText();
  expect(visibleBody).not.toContain(SENTINEL);
  expect(visibleBody).not.toContain(controlledEmail!);
  expect(visibleBody).not.toContain(controlledPassword!);

  writeReceipt({
    schemaVersion: 1,
    exactHeadSha: expectedHeadSha,
    canonicalUrl: new URL(page.url()).origin,
    accountClass: 'controlled-permanent-teen',
    checkpoints: {
      firstSignIn: 'passed',
      privateDeviceCacheSeeded: 'passed-with-synthetic-sentinel',
      sentinelLoadedIntoMountedState: 'passed',
      logoutReachedSignedOutLogin: 'passed',
      privateDeviceCacheCleared: 'passed',
      secondSignIn: 'passed',
      durableAccountReadsAfterRelogin: [...durableReads].sort(),
      staleSentinelNotRecovered: 'passed',
    },
    privacy: {
      screenshotsCaptured: false,
      traceCaptured: false,
      videoCaptured: false,
      credentialValuesWrittenToReceipt: false,
      privateResponseBodiesCaptured: false,
      privateUserContentUsed: false,
      syntheticSentinelOnly: true,
    },
    observedAt: new Date().toISOString(),
  });
});
