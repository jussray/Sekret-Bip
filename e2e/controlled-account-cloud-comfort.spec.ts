import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const controlledEmail = process.env.SEKRET_CONTROLLED_ACCOUNT_EMAIL?.trim();
const controlledPassword = process.env.SEKRET_CONTROLLED_ACCOUNT_PASSWORD?.trim();
const expectedHeadSha = process.env.EXPECTED_HEAD_SHA?.trim().toLowerCase();

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

function writeReceipt(value: Record<string, unknown>) {
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(
    'artifacts/controlled-account-cloud-comfort.json',
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

test('controlled Teen account reaches Cloud and Comfort without retaining private content', async ({ page, context }) => {
  test.setTimeout(150_000);
  test.skip(!expectedHeadSha, 'EXPECTED_HEAD_SHA is required for exact-production proof.');

  await signInTeen(page);

  await page.goto('/cloud?bipDevAudience=teen');
  const cloudInput = page.getByTestId('cloud-thought-input');
  const cloudSend = page.getByTestId('cloud-thought-send');
  await expect(cloudInput).toBeVisible({ timeout: 45_000 });
  await expect(cloudSend).toBeVisible();
  await expect(cloudSend).toBeDisabled();

  let interceptedSuccessRequests = 0;
  await page.route('**/api/sekret/reply', async route => {
    interceptedSuccessRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reply: 'Controlled synthetic reply.',
        tone: 'controlled-proof',
        avatarState: 'responding',
        safetyFlag: false,
        parentShareSummary: null,
        suggestedComfortTool: null,
        replySource: 'fallback',
      }),
    });
  });

  await cloudInput.fill('CI synthetic success check');
  await cloudSend.click();
  await expect(page.getByText('Controlled synthetic reply.', { exact: true })).toBeVisible({ timeout: 30_000 });
  expect(interceptedSuccessRequests).toBe(1);
  await page.unroute('**/api/sekret/reply');

  await context.setOffline(true);
  try {
    await cloudInput.fill('Are you real?');
    await cloudSend.click();
    await expect(
      page.getByText(/I'm (?:Suhana|Sy|Cloud|Night|Se'kret), an AI/i),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('cloud-thought-error')).toHaveCount(0);
    await expect(cloudInput).toHaveValue('');
  } finally {
    await context.setOffline(false);
  }

  await page.goto('/comfort?bipDevAudience=teen');
  await expect(page.getByText('Grounding Steps', { exact: true })).toBeVisible({ timeout: 45_000 });

  const stepOne = page.getByTestId('comfort-step-1');
  await expect(stepOne).toBeVisible();
  await expect(page.getByTestId('comfort-step-2')).toBeVisible();
  await expect(page.getByTestId('comfort-step-3')).toBeVisible();
  await expect(page.getByTestId('comfort-step-4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Calm Space and finish this Comfort visit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish this Comfort visit and return home' })).toBeVisible();

  await stepOne.click();
  await expect(stepOne).toBeChecked();

  const visibleBody = await page.locator('body').innerText();
  expect(visibleBody).not.toContain(controlledEmail!);
  expect(visibleBody).not.toContain(controlledPassword!);
  expect(visibleBody).not.toContain('CI synthetic success check');
  expect(visibleBody).not.toContain('Are you real?');

  writeReceipt({
    schemaVersion: 1,
    exactHeadSha: expectedHeadSha,
    canonicalUrl: new URL(page.url()).origin,
    accountClass: 'controlled-permanent-teen',
    checkpoints: {
      returningSignIn: 'passed',
      cloudAuthenticatedEntry: 'passed',
      cloudSyntheticSuccess: 'passed-with-intercepted-provider-request',
      cloudOfflineLocalRecovery: 'passed',
      comfortAuthenticatedEntry: 'passed',
      comfortGroundingControl: 'passed',
    },
    privacy: {
      screenshotsCaptured: false,
      traceCaptured: false,
      videoCaptured: false,
      credentialValuesWrittenToReceipt: false,
      privateUserContentUsed: false,
      syntheticCloudContentOnly: true,
    },
    observedAt: new Date().toISOString(),
  });
});
