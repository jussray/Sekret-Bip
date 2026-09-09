import { expect, test } from '@playwright/test';

type MotionSample = {
  opacity: number;
  transform: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

type StageSamples = Record<string, MotionSample[]>;

const STAGE_IDS = [
  'web-welcome-stage-parents',
  'web-welcome-stage-night',
  'web-welcome-stage-suhana',
  'web-welcome-stage-sy',
  'web-welcome-stage-cloud',
] as const;

async function installArrivalSampler(page: import('@playwright/test').Page) {
  await page.addInitScript((stageIds: string[]) => {
    const samples: Record<string, MotionSample[]> = Object.fromEntries(
      stageIds.map(id => [id, []]),
    );

    Object.defineProperty(window, '__sekretPhotoBlockingSamples', {
      configurable: true,
      value: samples,
    });

    const capture = () => {
      for (const id of stageIds) {
        const node = document.querySelector(`[data-testid="${id}"]`);
        if (node instanceof HTMLElement) {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          samples[id].push({
            opacity: Number.parseFloat(style.opacity),
            transform: style.transform,
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }
      }
      window.requestAnimationFrame(capture);
    };

    window.requestAnimationFrame(capture);
  }, [...STAGE_IDS]);
}

async function readSamples(page: import('@playwright/test').Page): Promise<StageSamples> {
  return page.evaluate(() => (
    window as typeof window & { __sekretPhotoBlockingSamples?: StageSamples }
  ).__sekretPhotoBlockingSamples ?? {});
}

test('canonical teen front door stages the family into photo positions, settles, and stays interactive', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await installArrivalSampler(page);

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('web-welcome-scene-arrival');
  const hero = page.getByTestId('web-welcome-hero-teen');
  const enter = page.getByTestId('web-welcome-enter');

  await expect(scene).toBeVisible();
  await expect(hero).toBeVisible();
  await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
  await expect(enter).toBeVisible();

  const pointerEvents = await scene.evaluate(node => getComputedStyle(node).pointerEvents);
  expect(pointerEvents).not.toBe('none');

  await expect(page.getByTestId('web-welcome-photo-blocking')).toBeVisible();
  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1, { timeout: 5_000 });
  await page.waitForTimeout(120);

  const samples = await readSamples(page);

  for (const id of STAGE_IDS) {
    const stageSamples = samples[id] ?? [];
    expect(stageSamples.length, `${id} should be sampled while moving`).toBeGreaterThan(3);
    expect(
      new Set(stageSamples.map(sample => sample.transform)).size,
      `${id} should change transform while taking its place`,
    ).toBeGreaterThan(1);
    expect(
      stageSamples.some(sample => sample.opacity < 0.5),
      `${id} should enter from a hidden/faded state`,
    ).toBe(true);
    expect(
      stageSamples.some(sample => sample.opacity > 0.85),
      `${id} should become clearly visible before the final photo`,
    ).toBe(true);
  }

  await expect(page.getByTestId('web-welcome-photo-blocking')).toHaveCount(0);
  await expect(hero).toBeVisible();

  const visibleText = await page.locator('body').innerText();
  expect(visibleText).not.toContain('Night · Suhana · Sy');

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('reduced motion renders the finished canonical photo immediately without character staging', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await installArrivalSampler(page);

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('web-welcome-scene-arrival')).toBeVisible();
  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
  await expect(page.getByTestId('web-welcome-photo-blocking')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1);
  await page.waitForTimeout(450);

  const samples = await readSamples(page);
  for (const id of STAGE_IDS) {
    expect(samples[id] ?? []).toHaveLength(0);
  }
});
