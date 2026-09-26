import { expect, test, type Page } from '@playwright/test';

const liveEmail = process.env.LIVE_ONBOARDING_EMAIL?.trim();
const livePassword = process.env.LIVE_ONBOARDING_PASSWORD?.trim() || 'PlaywrightOnly-123!';
const liveUsername = (process.env.LIVE_ONBOARDING_USERNAME?.trim() || `pw_${Date.now()}`)
  .toLowerCase()
  .replace(/[^a-z0-9_.]/g, '')
  .slice(0, 24);
const inviteEmail = process.env.LIVE_PARENT_INVITE_EMAIL?.trim();
const phase = process.env.LIVE_ONBOARDING_PHASE?.trim().toLowerCase() || 'signup';
const signInAttempts = Number.parseInt(process.env.LIVE_SIGNIN_ATTEMPTS?.trim() || '3', 10);
const signInRetryMs = Number.parseInt(process.env.LIVE_SIGNIN_RETRY_MS?.trim() || '5000', 10);

const shouldRunReadiness = phase === 'readiness' || phase === 'all';
const shouldRunSignup = phase === 'signup' || phase === 'all';
const shouldRunSignIn = phase === 'signin' || phase === 'all';
const shouldRunInvite = phase === 'invite' || phase === 'all';

type InviteResponseBody = {
  ok?: boolean;
  email?: {
    status?: string;
    error_code?: string | null;
  };
};

type AuthObservation = {
  kind: 'response' | 'requestfailed';
  path: string;
  status?: number;
  failure?: string | null;
};

function isInviteResponseBody(value: unknown): value is InviteResponseBody {
  return Boolean(value && typeof value === 'object');
}

async function attachPageState(page: Page, name: string, extra: Record<string, unknown> = {}) {
  const alert = page.getByRole('alert');
  const visibleAlert = (await alert.count()) > 0
    ? await alert.first().textContent({ timeout: 500 }).catch(() => null)
    : null;

  await test.info().attach(name, {
    body: JSON.stringify({
      url: page.url(),
      visibleAlert,
      title: await page.title().catch(() => null),
      ...extra,
    }, null, 2),
    contentType: 'application/json',
  });
}

async function signInTeen(page: Page) {
  await page.goto('/login?side=teen');
  await page.getByPlaceholder('Phone number, username or email').fill(liveEmail!);
  await page.getByPlaceholder('Password').fill(livePassword);

  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => null);

  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    await attachPageState(page, 'live-login-failed');
    throw new Error(`Live teen login failed: ${await alert.textContent()}`);
  }

  await expect(page.getByRole('button', { name: /log in/i })).toHaveCount(0, { timeout: 45_000 });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
}

test.describe('live onboarding email smoke', () => {
  test('exact preview reaches final Teen signup submit without an account write', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!shouldRunReadiness, 'Set LIVE_ONBOARDING_PHASE=readiness or all to run exact-preview readiness proof.');

    const pageErrors: string[] = [];
    let accountWriteAttempted = false;
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    await page.route('**/auth/v1/signup**', async (route) => {
      accountWriteAttempted = true;
      await route.abort('blockedbyclient');
    });

    await page.goto('/signup?side=teen');
    await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i }).click();
    await page.getByRole('button', { name: /Continue with teen setup/i }).click();
    await page.getByPlaceholder('Email address').fill('readiness-only@example.invalid');
    await page.getByPlaceholder('Password (8+ characters)').fill('PlaywrightOnly-123!');
    await page.getByPlaceholder('Confirm password').fill('PlaywrightOnly-123!');
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.getByPlaceholder('username').fill('pw_readiness_only');
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();

    await attachPageState(page, 'live-signup-readiness', {
      phase,
      checkpoint: 'teen_signup_final_submit_ready',
      accountWriteAttempted,
      pageErrors,
    });

    expect(accountWriteAttempted).toBe(false);
    expect(pageErrors).toEqual([]);
  });

  test('signup reaches the real email confirmation checkpoint', async ({ page }) => {
    test.setTimeout(180_000);
    test.skip(!shouldRunSignup, 'Set LIVE_ONBOARDING_PHASE=signup or all to run signup email smoke.');
    test.skip(!liveEmail, 'LIVE_ONBOARDING_EMAIL is required for live onboarding email smoke.');

    const networkConsoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const authObservations: AuthObservation[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') networkConsoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('response', (response) => {
      try {
        const url = new URL(response.url());
        if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/v1/')) {
          authObservations.push({ kind: 'response', path: url.pathname, status: response.status() });
        }
      } catch {
        // Ignore non-URL response values.
      }
    });
    page.on('requestfailed', (request) => {
      try {
        const url = new URL(request.url());
        if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/v1/')) {
          authObservations.push({
            kind: 'requestfailed',
            path: url.pathname,
            failure: request.failure()?.errorText ?? null,
          });
        }
      } catch {
        // Ignore non-URL request values.
      }
    });

    await page.goto('/signup?side=teen');
    await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /13\s*[–-]\s*15 Teen mode starts/i }).click();
    await page.getByRole('button', { name: /Continue with teen setup/i }).click();
    await page.getByPlaceholder('Email address').fill(liveEmail!);
    await page.getByPlaceholder('Password (8+ characters)').fill(livePassword);
    await page.getByPlaceholder('Confirm password').fill(livePassword);
    await page.getByRole('button', { name: /^next$/i }).click();

    await page.getByPlaceholder('username').fill(liveUsername);
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.getByRole('button', { name: /create account/i }).click();

    const confirmationCheckpoint = page.getByText('Check your email', { exact: true });
    const alert = page.getByRole('alert');

    await expect.poll(async () => {
      if (await confirmationCheckpoint.isVisible().catch(() => false)) return 'confirmation';
      if (await alert.isVisible().catch(() => false)) return 'alert';
      try {
        if (!new URL(page.url()).pathname.includes('/signup')) return 'post_auth';
      } catch {
        // Keep waiting on an unparsable transient URL.
      }
      return 'pending';
    }, {
      message: 'signup should leave its pending state',
      timeout: 120_000,
      intervals: [500, 1000, 2000, 3000, 5000],
    }).not.toBe('pending');

    if (await alert.isVisible().catch(() => false)) {
      await attachPageState(page, 'live-signup-alert', {
        authObservations,
        networkConsoleErrors,
        pageErrors,
      });
      throw new Error(`Live signup failed: ${await alert.textContent()}`);
    }

    const checkpoint = await confirmationCheckpoint.isVisible().catch(() => false)
      ? 'signup_confirmation_email'
      : 'post_auth_onboarding';

    await attachPageState(page, 'live-onboarding-email', {
      email: liveEmail,
      username: liveUsername,
      phase,
      checkpoint,
      authObservations,
      networkConsoleErrors,
      pageErrors,
      note: checkpoint === 'signup_confirmation_email'
        ? 'The production account reached the email-confirmation checkpoint.'
        : 'The account reached authenticated post-signup onboarding.',
    });

    expect(authObservations.some((observation) => observation.path.endsWith('/signup'))).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('confirmed teen account can return through sign in', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!shouldRunSignIn, 'Set LIVE_ONBOARDING_PHASE=signin or all to run returning sign-in proof.');
    test.skip(!liveEmail, 'LIVE_ONBOARDING_EMAIL is required for returning sign-in proof.');

    let lastFailure = 'sign-in was not attempted';
    let signedIn = false;

    for (let attempt = 1; attempt <= Math.max(signInAttempts, 1); attempt += 1) {
      try {
        await signInTeen(page);
        signedIn = true;
        await attachPageState(page, 'returning-teen-sign-in', {
          email: liveEmail,
          phase,
          attempt,
          checkpoint: 'authenticated_returning_user',
        });
        break;
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : String(error);
        if (attempt < Math.max(signInAttempts, 1)) {
          await page.waitForTimeout(Math.max(signInRetryMs, 1000));
        }
      }
    }

    expect(signedIn, `Returning teen sign-in never completed: ${lastFailure}`).toBe(true);
  });

  test('confirmed teen account can send parent invite email', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!shouldRunInvite, 'Set LIVE_ONBOARDING_PHASE=invite or all after confirming the signup email.');
    test.skip(!liveEmail, 'LIVE_ONBOARDING_EMAIL is required for live parent invite smoke.');
    test.skip(!inviteEmail, 'LIVE_PARENT_INVITE_EMAIL is required for live parent invite smoke.');

    const inviteResponses: Array<{ status: number; body: unknown }> = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/functions/v1/parent-link-create')) return;
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => null);
      }
      inviteResponses.push({ status: response.status(), body });
    });

    await signInTeen(page);
    await page.goto('/parent-link-verify');

    await expect(page.getByText(/private code|code check needed|creating your code/i)).toBeVisible({ timeout: 45_000 });
    await page.getByPlaceholder('parent@example.com').fill(inviteEmail!);
    await page.getByRole('button', { name: /send invite email/i }).click();

    await expect(page.getByText(/invite email sent|code created, but email did not send/i)).toBeVisible({ timeout: 45_000 });

    const latestInvite = inviteResponses.at(-1);
    await attachPageState(page, 'parent-link-create-response', {
      response: latestInvite ?? { error: 'no parent-link-create response captured' },
    });

    expect(latestInvite, 'parent-link-create response should be captured').toBeTruthy();
    expect(latestInvite?.status).toBe(200);
    expect(isInviteResponseBody(latestInvite?.body)).toBe(true);
    expect((latestInvite?.body as InviteResponseBody).ok).toBe(true);
    expect((latestInvite?.body as InviteResponseBody).email?.status).toBe('sent');
    expect((latestInvite?.body as InviteResponseBody).email?.error_code ?? null).toBeNull();
  });
});
