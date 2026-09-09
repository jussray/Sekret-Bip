import { expect, test } from '@playwright/test';

type MotionSample = {
  opacity: number;
  transform: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

async function installArrivalSampler(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const samples: MotionSample[] = [];
    Object.defineProperty(window, '__sekretSceneArrivalSamples', {
      configurable: true,
      value: samples,
    });

    const capture = () => {
      const scene = document.querySelector('[data-testid="web-welcome-scene-arrival"]');
      if (scene instanceof HTMLElement) {
        const style = getComputedStyle(scene);
        const rect = scene.getBoundingClientRect();
        samples.push({
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
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
}

async function readSamples(page: import('@playwright/test').Page): Promise<MotionSample[]> {
  return page.evaluate(() => (
    window as typeof window & { __sekretSceneArrivalSamples?: MotionSample[] }
  ).__sekretSceneArrivalSamples ?? []);
}

test('canonical teen front door enters as one scene, settles, and stays interactive', async ({ page }) => {
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

  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1, { timeout: 5_000 });
  await page.waitForTimeout(100);

  const samples = await readSamples(page);
  expect(samples.length).toBeGreaterThan(5);
  expect(samples.some(sample => sample.opacity < 0.95)).toBe(true);
  expect(samples.some(sample => sample.transform !== 'none' && sample.transform !== 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);

  const final = samples.at(-1);
  expect(final).toBeTruthy();
  expect(final!.opacity).toBeGreaterThanOrEqual(0.99);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('reduced motion renders the canonical scene settled from the first sampled frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await installArrivalSampler(page);

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('web-welcome-scene-arrival');
  await expect(scene).toBeVisible();
  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1);
  await page.waitForTimeout(450);

  const samples = await readSamples(page);
  expect(samples.length).toBeGreaterThan(2);

  for (const key of ['top', 'left', 'width', 'height'] as const) {
    const values = samples.map(sample => sample[key]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(0.5);
  }

  const opacities = samples.map(sample => sample.opacity);
  expect(Math.max(...opacities) - Math.min(...opacities)).toBeLessThanOrEqual(0.001);
  expect(Math.min(...opacities)).toBeGreaterThanOrEqual(0.99);

  const transforms = new Set(samples.map(sample => sample.transform));
  expect(transforms.size).toBe(1);
});
