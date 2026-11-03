import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const phase = process.env.LIVE_ONBOARDING_PHASE?.trim().toLowerCase() || 'readiness';
const shouldRunFamily = phase === 'family' || phase === 'all';
const teenEmail = process.env.LIVE_ONBOARDING_EMAIL?.trim();
const teenPassword = process.env.LIVE_ONBOARDING_PASSWORD?.trim();
const guardianEmail = process.env.SEKRET_CONTROLLED_GUARDIAN_EMAIL?.trim();
const guardianPassword = process.env.SEKRET_CONTROLLED_GUARDIAN_PASSWORD?.trim();
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA?.trim().toLowerCase();
const runId = process.env.GITHUB_RUN_ID?.trim() || String(Date.now());

function readProductionEnv(): Record<string, string> {
  const source = fs.readFileSync(path.resolve(process.cwd(), '.env.production'), 'utf8');
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        const separator = line.indexOf('=');
        return separator === -1 ? [line, ''] : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const productionEnv = readProductionEnv();
const supabaseUrl = productionEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = productionEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || productionEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type ProviderSession = { accessToken: string; userId: string };

async function providerSession(email: string, password: string): Promise<ProviderSession> {
  expect(supabaseUrl).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  expect(supabaseKey).toMatch(/^(sb_publishable_|eyJ)/);

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Controlled provider sign-in failed with HTTP ${response.status}.`);
  const body = await response.json() as { access_token?: string; user?: { id?: string } };
  if (!body.access_token || !body.user?.id) throw new Error('Controlled provider sign-in returned no permanent identity.');
  return { accessToken: body.access_token, userId: body.user.id };
}

async function restRows<T>(session: ProviderSession, pathAndQuery: string): Promise<T[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Supabase read failed with HTTP ${response.status}.`);
  const body = await response.json();
  if (!Array.isArray(body)) throw new Error('Supabase read did not return an array.');
  return body as T[];
}

async function signIn(page: Page, side: 'teen' | 'parent', email: string, password: string) {
  await page.goto(`/login?side=${side}`);
  await page.getByPlaceholder('Phone number, username or email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => null);
  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(`Live ${side} sign in failed: ${await alert.textContent()}`);
  }
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
}

async function signOut(page: Page) {
  await page.goto('/logout');
  await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
}

function writeReceipt(value: Record<string, unknown>) {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/live-family-authority.json', `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('exact preview preserves permanent identity, Circle pseudonymity, Teen-controlled Bridge, Teen assurance, and Bip Jr authority', async ({ page }) => {
  test.setTimeout(360_000);
  test.skip(!shouldRunFamily, 'Set LIVE_ONBOARDING_PHASE=family or all to run family authority proof.');

  if (!teenEmail || !teenPassword) throw new Error('LIVE_FAMILY_TEEN_FIXTURE_MISSING');
  if (!guardianEmail || !guardianPassword) throw new Error('CONTROLLED_GUARDIAN_FIXTURE_MISSING');
  if (!expectedHeadSha) throw new Error('EXPECTED_HEAD_SHA is required for exact-head family proof.');

  const teenProvider = await providerSession(teenEmail, teenPassword);
  const guardianProvider = await providerSession(guardianEmail, guardianPassword);
  const privateTeenName = `proof-teen-${runId.slice(-8)}`;
  const jrAlias = `proof-jr-${runId.slice(-8)}`;

  const guardianProfiles = await restRows<{ account_side: string; onboarding_complete: boolean }>(
    guardianProvider,
    `app_profiles?select=account_side,onboarding_complete&user_id=eq.${guardianProvider.userId}`,
  );
  const guardianVerification = await restRows<{ verification_state: string }>(
    guardianProvider,
    `account_verification?select=verification_state&user_id=eq.${guardianProvider.userId}`,
  );
  expect(guardianProfiles[0]).toMatchObject({ account_side: 'parent', onboarding_complete: true });
  expect(guardianVerification[0]?.verification_state).toBe('VERIFIED_GUARDIAN');

  await signIn(page, 'teen', teenEmail, teenPassword);

  await page.goto('/age');
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /13\s*[–-]\s*15/ }).click();
  await page.getByRole('button', { name: /Continue with teen setup/i }).click();

  await expect(page.getByText('Your choices should be clear.')).toBeVisible({ timeout: 30_000 });
  const consentBoxes = page.getByRole('checkbox');
  await expect(consentBoxes).toHaveCount(2);
  await consentBoxes.nth(0).click();
  await consentBoxes.nth(1).click();
  await page.getByRole('button', { name: 'Save consent choices and continue' }).click();

  await expect(page.getByLabel('Your name or nickname')).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Your name or nickname').fill(privateTeenName);
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('radiogroup', { name: 'You are' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('radio', { name: 'Girl' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByLabel('Your reflection')).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Your reflection').fill('Synthetic family authority proof.');
  await page.getByRole('button', { name: "Enter Se'kret Bip" }).click();
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => null);

  const teenProfiles = await restRows<{ account_side: string; private_display_name: string; onboarding_complete: boolean; age_range: string }>(
    teenProvider,
    `app_profiles?select=account_side,private_display_name,onboarding_complete,age_range&user_id=eq.${teenProvider.userId}`,
  );
  const circleProfiles = await restRows<{ nickname: string }>(
    teenProvider,
    `circle_profiles?select=nickname&user_id=eq.${teenProvider.userId}`,
  );
  expect(teenProfiles[0]).toMatchObject({
    account_side: 'teen',
    private_display_name: privateTeenName,
    onboarding_complete: true,
    age_range: '13-15',
  });
  expect(circleProfiles[0]?.nickname).toBe('anonymous bip');
  expect(circleProfiles[0]?.nickname).not.toBe(privateTeenName);
  expect(circleProfiles[0]?.nickname).not.toBe(teenEmail);

  const beforeLink = await restRows<{ verification_state: string; parent_link_state: string }>(
    teenProvider,
    `account_verification?select=verification_state,parent_link_state&user_id=eq.${teenProvider.userId}`,
  );
  expect(beforeLink[0]?.verification_state).not.toBe('VERIFIED_TEEN');

  await page.goto('/parent-link-verify');
  await expect(page.getByText('TRUSTED CONNECTION')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/linking alone does not verify your account/i)).toBeVisible();

  const pendingLinks = await expect.poll(async () => restRows<{ invite_code: string | null; status: string }>(
    teenProvider,
    `parent_links?select=invite_code,status&teen_user_id=eq.${teenProvider.userId}&status=eq.pending`,
  ), { timeout: 45_000 }).toHaveLength(1);
  void pendingLinks;
  const linkRows = await restRows<{ invite_code: string | null; status: string }>(
    teenProvider,
    `parent_links?select=invite_code,status&teen_user_id=eq.${teenProvider.userId}&status=eq.pending`,
  );
  const inviteCode = linkRows[0]?.invite_code;
  expect(inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  await expect(page.getByText(inviteCode!, { exact: true })).toBeVisible({ timeout: 30_000 });

  await signOut(page);
  await signIn(page, 'parent', guardianEmail, guardianPassword);
  await page.goto('/parent-link');
  await page.getByLabel('Teen private invite code').fill(inviteCode!);
  await page.getByRole('button', { name: 'Connect accounts' }).click();

  await expect.poll(async () => {
    const rows = await restRows<{ verification_state: string; parent_link_state: string }>(
      teenProvider,
      `account_verification?select=verification_state,parent_link_state&user_id=eq.${teenProvider.userId}`,
    );
    return rows[0] ?? null;
  }, { timeout: 45_000 }).toEqual(expect.objectContaining({ parent_link_state: 'active' }));

  const afterLink = await restRows<{ verification_state: string; parent_link_state: string }>(
    teenProvider,
    `account_verification?select=verification_state,parent_link_state&user_id=eq.${teenProvider.userId}`,
  );
  expect(afterLink[0]?.verification_state).not.toBe('VERIFIED_TEEN');

  const forbiddenTeenJournal = await restRows<{ id: number }>(
    guardianProvider,
    `journal_entries?select=id&user_id=eq.${teenProvider.userId}&limit=1`,
  );
  expect(forbiddenTeenJournal).toEqual([]);

  await signOut(page);
  await signIn(page, 'teen', teenEmail, teenPassword);
  await page.goto('/bridge');
  await expect(page.getByText('What would help after you send this?')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('radio', { name: /just listen/i }).click();
  await page.getByText('My Mood', { exact: true }).click();
  await page.getByText('Soft Start', { exact: true }).click();
  await page.getByPlaceholder("tell them how you're feeling…").fill('Synthetic Bridge proof.');
  await page.getByRole('button', { name: /send to bridge/i }).click();
  await expect(page.getByText('sent to your person.', { exact: true })).toBeVisible({ timeout: 45_000 });

  const bridgeSignals = await restRows<{ share_type: string; conv_mode: string | null; response_preference: string | null }>(
    teenProvider,
    `bridge_signals?select=share_type,conv_mode,response_preference&teen_user_id=eq.${teenProvider.userId}&order=sent_at.desc&limit=1`,
  );
  expect(bridgeSignals[0]).toMatchObject({ share_type: 'mood', conv_mode: 'soft', response_preference: 'listen' });

  await signOut(page);
  await signIn(page, 'parent', guardianEmail, guardianPassword);
  await page.goto('/bridge');
  await expect(page.getByText('Parent Bridge', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Mood signal', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Listen first. Do not rush to solve it.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Linking does not unlock journals, chats, mood history/i)).toBeVisible();

  await page.goto('/teen-verification');
  await expect(page.getByText(/Confirm age\./)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Confirm Teen age assurance' }).click();
  await expect(page.getByText('Age assurance confirmed')).toBeVisible({ timeout: 45_000 });

  const verifiedTeen = await restRows<{ verification_state: string; parent_link_state: string }>(
    teenProvider,
    `account_verification?select=verification_state,parent_link_state&user_id=eq.${teenProvider.userId}`,
  );
  expect(verifiedTeen[0]).toMatchObject({ verification_state: 'VERIFIED_TEEN', parent_link_state: 'active' });
  const assurance = await restRows<{ method: string; age_bucket: string; guardian_user_id: string | null }>(
    teenProvider,
    `teen_age_assurance_receipts?select=method,age_bucket,guardian_user_id&teen_user_id=eq.${teenProvider.userId}&superseded_at=is.null`,
  );
  expect(assurance[0]).toMatchObject({ method: 'guardian_confirmation', age_bucket: '13-15', guardian_user_id: guardianProvider.userId });

  await page.goto('/bip-jr');
  await expect(page.getByText(/Their little space\./)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/do not get a separate email, password, or Teen account/i)).toBeVisible();
  await page.getByLabel('Bip Jr name or nickname').fill(jrAlias);
  await page.getByRole('button', { name: 'Ages 5–7' }).click();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name: 'Create Bip Jr profile' }).click();
  await expect(page.getByText(jrAlias, { exact: true })).toBeVisible({ timeout: 45_000 });

  const jrRows = await restRows<{ id: string; display_alias: string; age_band: string; status: string }>(
    guardianProvider,
    `jr_child_profiles?select=id,display_alias,age_band,status&guardian_user_id=eq.${guardianProvider.userId}&display_alias=eq.${encodeURIComponent(jrAlias)}`,
  );
  expect(jrRows[0]).toMatchObject({ display_alias: jrAlias, age_band: '5-7', status: 'active' });
  const jrReceipts = await restRows<{ consent_version: string; revoked_at: string | null }>(
    guardianProvider,
    `jr_parental_consent_receipts?select=consent_version,revoked_at&child_profile_id=eq.${jrRows[0].id}`,
  );
  expect(jrReceipts[0]).toMatchObject({ consent_version: 'bip-jr-parental-consent-v1', revoked_at: null });

  await page.getByRole('button', { name: `Archive ${jrAlias} Bip Jr profile` }).click();
  await expect(page.getByText(jrAlias, { exact: true })).toHaveCount(0, { timeout: 45_000 });
  const archivedJr = await restRows<{ status: string }>(
    guardianProvider,
    `jr_child_profiles?select=status&id=eq.${jrRows[0].id}`,
  );
  const revokedConsent = await restRows<{ revoked_at: string | null }>(
    guardianProvider,
    `jr_parental_consent_receipts?select=revoked_at&child_profile_id=eq.${jrRows[0].id}`,
  );
  expect(archivedJr[0]?.status).toBe('archived');
  expect(revokedConsent[0]?.revoked_at).toBeTruthy();

  writeReceipt({
    schemaVersion: 1,
    exactHeadSha: expectedHeadSha,
    canonicalUrl: new URL(page.url()).origin,
    accountClasses: ['disposable-permanent-teen', 'controlled-verified-guardian', 'guardian-managed-bip-jr-profile'],
    checkpoints: {
      permanentTeenSignIn: 'passed',
      teenOnboarding: 'passed-real-ui',
      circlePseudonymity: 'passed-distinct-profile-row',
      parentLink: 'passed-real-ui',
      parentLinkDidNotVerifyTeen: 'passed',
      parentPrivatePullDenied: 'passed',
      bridgeSignalWrite: 'passed-real-ui-and-provider-row',
      parentBridgeSignalVisible: 'passed-real-ui',
      teenAgeAssurance: 'passed-explicit-guardian-action',
      bipJrProvisioning: 'passed-real-ui-and-consent-receipt',
      bipJrArchive: 'passed-consent-revoked',
    },
    privacy: {
      screenshotsCaptured: false,
      traceCaptured: false,
      videoCaptured: false,
      credentialsWrittenToReceipt: false,
      authTokensWrittenToReceipt: false,
      userIdsWrittenToReceipt: false,
      privateMessageContentWrittenToReceipt: false,
      syntheticContentOnly: true,
    },
    observedAt: new Date().toISOString(),
  });
});
