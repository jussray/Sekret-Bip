import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const controlledEmail = process.env.SEKRET_CONTROLLED_ACCOUNT_EMAIL?.trim();
const controlledPassword = process.env.SEKRET_CONTROLLED_ACCOUNT_PASSWORD?.trim();
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA?.trim().toLowerCase();
const STALE_SENTINEL = 'CI_ACCOUNT_A_PRIVATE_CACHE_SENTINEL';
const STALE_ENTRY_ID = 99119911;
const DURABLE_SENTINEL = 'CI_DURABLE_ACCOUNT_RECOVERY_SENTINEL';
const DURABLE_ENTRY_ID = 99119921;
const PRIVATE_CACHE_KEYS = ['entries', 'circlePosts', 'roomMemory', 'teen_profile_data'];
const DURABLE_TABLES = new Set([
  'journal_entries',
  'mood_history',
  'voice_notes',
  'comfort_sessions',
  'room_memory',
  'period_days',
]);

function readProductionEnv(): Record<string, string> {
  const source = fs.readFileSync(path.resolve(process.cwd(), '.env.production'), 'utf8');
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const separator = line.indexOf('=');
        return separator === -1
          ? [line, '']
          : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const productionEnv = readProductionEnv();
const supabaseUrl = productionEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  productionEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  productionEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type ControlledProviderSession = {
  accessToken: string;
  userId: string;
};

async function createControlledProviderSession(): Promise<ControlledProviderSession> {
  test.skip(!controlledEmail, 'SEKRET_CONTROLLED_ACCOUNT_EMAIL is required.');
  test.skip(!controlledPassword, 'SEKRET_CONTROLLED_ACCOUNT_PASSWORD is required.');
  expect(supabaseUrl).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  expect(supabasePublishableKey).toMatch(/^(sb_publishable_|eyJ)/);
  expect(supabasePublishableKey).not.toMatch(/^sb_secret_/);

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: controlledEmail,
      password: controlledPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Controlled Supabase fixture authentication failed with HTTP ${response.status}.`);
  }

  const body = await response.json() as {
    access_token?: string;
    user?: { id?: string };
  };
  if (!body.access_token || !body.user?.id) {
    throw new Error('Controlled Supabase fixture authentication returned no permanent session identity.');
  }

  return {
    accessToken: body.access_token,
    userId: body.user.id,
  };
}

async function mutateDurableFixture(
  session: ControlledProviderSession,
  operation: 'upsert' | 'delete',
): Promise<void> {
  const headers = {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${session.accessToken}`,
    'content-type': 'application/json',
    Prefer: 'return=minimal,resolution=merge-duplicates',
  };

  const response = operation === 'upsert'
    ? await fetch(`${supabaseUrl}/rest/v1/journal_entries?on_conflict=user_id,id`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: session.userId,
          id: DURABLE_ENTRY_ID,
          text: DURABLE_SENTINEL,
          mood: 'okay',
          date: '9/18/2026',
          time: '9:00 PM',
          owner_side: 'teen',
          source: 'me',
          entry_mode: 'typed',
          locked: true,
        }),
      })
    : await fetch(`${supabaseUrl}/rest/v1/journal_entries?id=eq.${DURABLE_ENTRY_ID}`, {
        method: 'DELETE',
        headers,
      });

  if (!response.ok) {
    throw new Error(`Controlled durable fixture ${operation} failed with HTTP ${response.status}.`);
  }
}

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

test('controlled account clears mounted/device-private state on logout and recovers durable state after relogin', async ({ page }) => {
  test.setTimeout(180_000);
  test.skip(!expectedHeadSha, 'EXPECTED_HEAD_SHA is required for exact-production proof.');

  const providerSession = await createControlledProviderSession();
  let fixturePresent = false;

  try {
    await mutateDurableFixture(providerSession, 'upsert');
    fixturePresent = true;

    await signInTeen(page);
    await page.goto(`/pages/${DURABLE_ENTRY_ID}`);
    await expect(page.getByText(DURABLE_SENTINEL, { exact: true })).toBeVisible({ timeout: 45_000 });

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
    }, { sentinel: STALE_SENTINEL, entryId: STALE_ENTRY_ID, privateKeys: PRIVATE_CACHE_KEYS });

    // Force the signed-in app to hydrate synthetic device state before logout.
    // This prevents a storage-only pass from masquerading as mounted-state isolation.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.goto(`/pages/${STALE_ENTRY_ID}`);
    await expect(page.getByText(STALE_SENTINEL, { exact: true })).toBeVisible({ timeout: 30_000 });

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });

    await expect.poll(async () => page.evaluate(
      keys => keys.every(key => localStorage.getItem(key) === null),
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

    await expect.poll(() => durableReads.has('journal_entries'), {
      message: 'Expected account-scoped journal_entries read after relogin.',
      timeout: 45_000,
    }).toBe(true);

    await page.goto(`/pages/${DURABLE_ENTRY_ID}`);
    await expect(page.getByText(DURABLE_SENTINEL, { exact: true })).toBeVisible({ timeout: 45_000 });

    await page.goto(`/pages/${STALE_ENTRY_ID}`);
    await expect(page.getByText(STALE_SENTINEL, { exact: true })).toHaveCount(0);

    const visibleBody = await page.locator('body').innerText();
    expect(visibleBody).not.toContain(STALE_SENTINEL);
    expect(visibleBody).not.toContain(controlledEmail!);
    expect(visibleBody).not.toContain(controlledPassword!);

    await mutateDurableFixture(providerSession, 'delete');
    fixturePresent = false;

    writeReceipt({
      schemaVersion: 2,
      exactHeadSha: expectedHeadSha,
      canonicalUrl: new URL(page.url()).origin,
      accountClass: 'controlled-permanent-teen',
      checkpoints: {
        providerFixtureCreated: 'passed-synthetic-private-row',
        firstSignIn: 'passed',
        durableFixtureVisibleBeforeLogout: 'passed',
        staleDeviceCacheSeeded: 'passed-with-synthetic-sentinel',
        staleSentinelLoadedIntoMountedState: 'passed',
        logoutReachedSignedOutLogin: 'passed',
        privateDeviceCacheCleared: 'passed',
        secondSignIn: 'passed',
        durableJournalReadAfterRelogin: 'passed',
        durableFixtureRecoveredAfterRelogin: 'passed',
        staleDeviceSentinelNotRecovered: 'passed',
        providerFixtureDeleted: 'passed',
      },
      privacy: {
        screenshotsCaptured: false,
        traceCaptured: false,
        videoCaptured: false,
        credentialValuesWrittenToReceipt: false,
        authTokensWrittenToReceipt: false,
        userIdsWrittenToReceipt: false,
        privateResponseBodiesCaptured: false,
        privateUserContentUsed: false,
        syntheticSentinelsOnly: true,
      },
      observedAt: new Date().toISOString(),
    });
  } finally {
    if (fixturePresent) {
      await mutateDurableFixture(providerSession, 'delete').catch(() => undefined);
    }
  }
});
