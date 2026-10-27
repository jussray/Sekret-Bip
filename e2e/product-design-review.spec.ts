import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

const VARIANTS = [
  {
    name: 'teen',
    url: '/?bipDevAudience=teen',
    heroTestId: 'web-welcome-hero-teen',
    identityText: 'YOUR PEOPLE. YOUR PEACE.',
    enterName: "Se'kret Bip teen welcome — continue to age setup",
  },
  {
    name: 'bip-jr',
    url: '/?bipDevAudience=bip-jr',
    heroTestId: 'web-welcome-hero-bip-jr',
    identityText: 'YOUR FAMILY. YOUR SPACE.',
    enterName: 'Bip Jr family welcome — continue to family setup',
  },
] as const;

const FOUNDER_VISUAL_DIR = path.resolve(
  process.env.PLAYWRIGHT_ARTIFACT_DIR ?? 'artifacts/product-design-playwright',
  'founder-visual',
);

const EXPECTED_FOUNDER_SCREENS = [
  '01-teen-welcome',
  '02-teen-setup',
  '03-teen-room',
  '04-companion-entry',
  '05-companion-listening',
] as const;

type FounderVisualStatus = 'running' | 'passed' | 'failed';

function resolveTestedHeadSha(): string {
  const configured = process.env.EXPECTED_HEAD_SHA ?? process.env.GITHUB_SHA;
  if (configured) return configured.trim().toLowerCase();

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
  } catch {
    return 'unknown';
  }
}

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    htmlClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));
  const viewportWidth = Math.min(
    metrics.innerWidth,
    metrics.htmlClientWidth,
    metrics.bodyClientWidth || metrics.innerWidth,
  );
  expect(Math.max(metrics.htmlScrollWidth, metrics.bodyScrollWidth)).toBeLessThanOrEqual(viewportWidth + 1);
}

async function writeFounderVisualManifest(input: {
  completedScreens: string[];
  status: FounderVisualStatus;
  stage: string | null;
  failure?: unknown;
  retry: number;
}) {
  await fs.mkdir(FOUNDER_VISUAL_DIR, { recursive: true });

  const failure = input.failure
    ? {
        stage: input.stage,
        message: input.failure instanceof Error ? input.failure.message : String(input.failure),
        occurredAt: new Date().toISOString(),
      }
    : null;

  await fs.writeFile(
    path.join(FOUNDER_VISUAL_DIR, 'manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        repository: process.env.GITHUB_REPOSITORY ?? 'jussray/Sekret-Bip',
        headSha: resolveTestedHeadSha(),
        eventName: process.env.GITHUB_EVENT_NAME ?? 'local',
        retry: input.retry,
        status: input.status,
        viewport: { width: 390, height: 844 },
        audience: 'teen',
        evidenceClass: 'controlled-founder-visual-proof',
        productionClaim: false,
        expectedScreens: EXPECTED_FOUNDER_SCREENS.map(name => `${name}.png`),
        completedScreens: input.completedScreens.map(name => `${name}.png`),
        failure,
      },
      null,
      2,
    ),
  );
}

async function captureFounderVisual(
  page: Page,
  testInfo: TestInfo,
  filename: string,
) {
  const body = await page.screenshot({
    fullPage: true,
    animations: 'disabled',
  });

  await fs.mkdir(FOUNDER_VISUAL_DIR, { recursive: true });
  await fs.writeFile(path.join(FOUNDER_VISUAL_DIR, `${filename}.png`), body);

  await testInfo.attach(`${filename}.png`, {
    body,
    contentType: 'image/png',
  });
}

for (const variant of VARIANTS) {
  for (const viewport of VIEWPORTS) {
    test(`rollback evidence: ${variant.name} ${viewport.name} front door`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', error => pageErrors.push(error.message));

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(variant.url, { waitUntil: 'networkidle' });

      await expect(page.getByTestId('web-welcome-shell')).toBeVisible();
      await expect(page.getByTestId('web-welcome-living-world')).toBeVisible();
      await expect(page.getByTestId(variant.heroTestId)).toBeVisible();
      await expect(page.getByText(variant.identityText, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: variant.enterName, exact: true })).toBeVisible();
      await expect(page.getByTestId('web-welcome-bottom-nav')).toHaveCount(0);
      await expect(page.getByText('Night · Suhana · Sy', { exact: true })).toHaveCount(0);
      await expectNoDocumentHorizontalOverflow(page);

      const heightMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));
      expect(heightMetrics.scrollHeight).toBeGreaterThanOrEqual(heightMetrics.clientHeight);

      await testInfo.attach(`${variant.name}-${viewport.name}-rollback-front-door.png`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });

      expect(pageErrors, `Uncaught page errors: ${pageErrors.join('\n')}`).toEqual([]);
      expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    });
  }
}

test('reduced motion is still from the first rendered hero frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const samples: Array<{ top: number; left: number; width: number; height: number }> = [];
    Object.defineProperty(window, '__sekretReducedMotionSamples', {
      configurable: true,
      value: samples,
    });

    const capture = () => {
      const hero = document.querySelector('[data-testid="web-welcome-hero-motion"]');
      if (hero instanceof HTMLElement) {
        const rect = hero.getBoundingClientRect();
        samples.push({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
      window.requestAnimationFrame(capture);
    };

    window.requestAnimationFrame(capture);
  });

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('web-welcome-hero-motion')).toBeVisible();
  await page.waitForTimeout(400);

  const samples = await page.evaluate(() => (
    window as typeof window & {
      __sekretReducedMotionSamples?: Array<{
        top: number;
        left: number;
        width: number;
        height: number;
      }>;
    }
  ).__sekretReducedMotionSamples ?? []);

  expect(samples.length).toBeGreaterThan(2);

  for (const key of ['top', 'left', 'width', 'height'] as const) {
    const values = samples.map(sample => sample[key]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(0.5);
  }
});

test('Teen entry preserves the teen onboarding path', async ({ page }) => {
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'networkidle' });
  await page.getByTestId('web-welcome-enter').click();
  await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
  await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 15_000 });
  await expectNoDocumentHorizontalOverflow(page);
});

test('Bip Jr entry preserves the parent onboarding path without a splash step', async ({ page }) => {
  await page.goto('/?bipDevAudience=bip-jr', { waitUntil: 'networkidle' });
  await page.getByTestId('web-welcome-enter').click();
  await expect(page).toHaveURL(/\/parent-welcome(?:\?|$)/);
  await expect(page.getByRole('button', { name: 'Create my Parent account' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'I already have an account' })).toBeVisible({ timeout: 15_000 });
  await expectNoDocumentHorizontalOverflow(page);
});

test('Circle renders Open Bip as the public audience layer with the face rule', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/circle?bipDevSide=teen', { waitUntil: 'networkidle' });

  await expect(page.getByText('🌐 Circle', { exact: true })).toBeVisible();
  await expect(page.getByText('🌎 Open Bip', { exact: true })).toBeVisible();
  await expect(page.getByText('inside Circle · faces stay hidden here', { exact: true })).toBeVisible();
  await expect(page.getByText('Public Circle and public niches. Visible faces are not allowed.', { exact: true })).toBeVisible();

  await testInfo.attach('circle-open-bip-audience.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});

for (const viewport of VIEWPORTS) {
  test(`Voice Bip complete presence room holds still with reduced motion on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/voicebip?bipDevSide=teen', { waitUntil: 'networkidle' });

    const liveAvatar = page.getByTestId('voice-presence-avatar-live');
    const cloud = page.getByTestId('voice-presence-cloud');
    const pill = page.getByTestId('voice-presence-pill');
    await expect(liveAvatar).toBeVisible({ timeout: 15_000 });
    await expect(cloud).toBeVisible({ timeout: 15_000 });
    await expect(pill).toBeVisible({ timeout: 15_000 });

    const readMotion = async () => Promise.all([liveAvatar, cloud, pill].map(locator => locator.evaluate(node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        transform: style.transform,
        opacity: Number.parseFloat(style.opacity),
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    })));

    const first = await readMotion();
    await page.waitForTimeout(500);
    const second = await readMotion();

    first.forEach((sample, index) => {
      const next = second[index];
      expect(next.transform).toBe(sample.transform);
      expect(Math.abs(next.opacity - sample.opacity)).toBeLessThanOrEqual(0.001);
      for (const key of ['top', 'left', 'width', 'height'] as const) {
        expect(Math.abs(next[key] - sample[key])).toBeLessThanOrEqual(0.5);
      }
    });

    await expectNoDocumentHorizontalOverflow(page);

    await testInfo.attach(`voice-bip-${viewport.name}-reduced-motion.png`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    });
  });
}

test('Founder Visual Truth: Teen first-five-minute packet', async ({ page }, testInfo) => {
  const completedScreens: string[] = [];
  let currentStage: string | null = null;

  await page.setViewportSize({ width: 390, height: 844 });
  await writeFounderVisualManifest({
    completedScreens,
    status: 'running',
    stage: currentStage,
    retry: testInfo.retry,
  });

  const capture = async (name: (typeof EXPECTED_FOUNDER_SCREENS)[number]) => {
    await captureFounderVisual(page, testInfo, name);
    completedScreens.push(name);
    await writeFounderVisualManifest({
      completedScreens,
      status: 'running',
      stage: currentStage,
      retry: testInfo.retry,
    });
  };

  try {
    currentStage = '01-teen-welcome';
    await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('web-welcome-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);
    await capture('01-teen-welcome');

    currentStage = '02-teen-setup';
    await page.getByTestId('web-welcome-enter').click();
    await expect(page).toHaveURL(/\/welcome(?:\?|$)/);
    await expect(page.getByText('How old are you?')).toBeVisible({ timeout: 15_000 });
    await expectNoDocumentHorizontalOverflow(page);
    await capture('02-teen-setup');

    currentStage = '03-teen-room';
    await page.goto('/room?bipDevSide=teen', { waitUntil: 'domcontentloaded' });
    const companion = page.getByRole('button', { name: /is here\. Tap to talk\./i }).first();
    await expect(companion).toBeVisible({ timeout: 15_000 });
    await expectNoDocumentHorizontalOverflow(page);
    await capture('03-teen-room');

    currentStage = '04-companion-entry';
    await companion.click();
    await expect(page).toHaveURL(/\/pages(?:\/|\?|$)/);
    await expectNoDocumentHorizontalOverflow(page);
    await capture('04-companion-entry');

    currentStage = '05-companion-listening';
    const composer = page.getByRole('textbox').first();
    await expect(composer).toBeVisible({ timeout: 15_000 });
    await composer.fill("Today felt like a lot. I don't need fixing — just somewhere to put it.");
    await expectNoDocumentHorizontalOverflow(page);
    await capture('05-companion-listening');

    currentStage = null;
    await writeFounderVisualManifest({
      completedScreens,
      status: 'passed',
      stage: currentStage,
      retry: testInfo.retry,
    });
  } catch (error) {
    await writeFounderVisualManifest({
      completedScreens,
      status: 'failed',
      stage: currentStage,
      failure: error,
      retry: testInfo.retry,
    });
    throw error;
  }
});
