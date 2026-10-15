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

test('canonical teen front door enters as one scene, settles, and stays interactive', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await installArrivalSampler(page);

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('web-welcome-scene-arrival');
  const hero = page.getByTestId('web-welcome-hero-teen');
  const enter = page.getByTestId('web-welcome-enter');
  const qualityBackdrop = page.getByTestId('web-welcome-quality-backdrop');
  const qualityWash = page.getByTestId('web-welcome-quality-wash');
  const qualityVignette = page.getByTestId('web-welcome-quality-vignette');
  const qualityRim = page.getByTestId('web-welcome-quality-rim');

  await expect(scene).toBeVisible();
  await expect(hero).toBeVisible();
  await expect(qualityBackdrop).toBeVisible();
  await expect(qualityWash).toBeVisible();
  await expect(qualityVignette).toBeVisible();
  await expect(qualityRim).toBeVisible();
  await expect(page.getByText('YOUR PEOPLE. YOUR PEACE.', { exact: true })).toBeVisible();
  await expect(page.getByText('Night · Suhana · Sy', { exact: true })).toHaveCount(0);
  await expect(enter).toBeVisible();

  const pointerEvents = await scene.evaluate(node => getComputedStyle(node).pointerEvents);
  expect(pointerEvents).not.toBe('none');

  // Measure the finish layers only after the intentional scene-arrival transform
  // has settled. Comparing them during the scale-in animation creates a false
  // failure because boundingBox() correctly reports the transformed dimensions.
  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1, { timeout: 5_000 });
  await page.waitForTimeout(100);

  const [sceneBox, backdropBox] = await Promise.all([
    scene.boundingBox(),
    qualityBackdrop.boundingBox(),
  ]);
  expect(sceneBox).toBeTruthy();
  expect(backdropBox).toBeTruthy();
  expect(Math.abs(backdropBox!.width - sceneBox!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(backdropBox!.height - sceneBox!.height)).toBeLessThanOrEqual(1);

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

  await testInfo.attach('teen-front-door-quality-proof.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});

test('reduced motion renders the canonical scene settled from the first sampled frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await installArrivalSampler(page);

  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  const scene = page.getByTestId('web-welcome-scene-arrival');
  await expect(scene).toBeVisible();
  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible();
  await expect(page.getByTestId('web-welcome-quality-backdrop')).toBeVisible();
  await expect(page.getByTestId('web-welcome-quality-wash')).toBeVisible();
  await expect(page.getByTestId('web-welcome-quality-vignette')).toBeVisible();
  await expect(page.getByTestId('web-welcome-quality-rim')).toBeVisible();
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

type AudienceMotionSample = {
  audience: 'teen' | 'bip-jr';
  copy: number;
  hero: number;
  cues: number;
};

async function sampleAudienceMotion(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const samples: AudienceMotionSample[] = [];
    (window as typeof window & { __sekretAudienceMotionSamples?: AudienceMotionSample[] })
      .__sekretAudienceMotionSamples = samples;

    const capture = () => {
      const copy = document.querySelector('[data-testid="web-welcome-copy-reveal"]');
      const hero = document.querySelector('[data-testid="web-welcome-hero-reveal"]');
      const cues = document.querySelector('[data-testid="web-welcome-world-cues"]');
      const isJr = document.querySelector('[data-testid="web-welcome-hero-bip-jr"]');
      if (copy && hero && cues) {
        samples.push({
          audience: isJr ? 'bip-jr' : 'teen',
          copy: Number.parseFloat(getComputedStyle(copy).opacity),
          hero: Number.parseFloat(getComputedStyle(hero).opacity),
          cues: Number.parseFloat(getComputedStyle(cues).opacity),
        });
      }
      window.requestAnimationFrame(capture);
    };
    window.requestAnimationFrame(capture);
  });
}

test('canonical teen front door reveals family artwork and switches to Bip Jr without hiding entry', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await sampleAudienceMotion(page);
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('web-welcome-scene-settled')).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(700);

  const read = () => page.evaluate(() => (
    window as typeof window & { __sekretAudienceMotionSamples?: AudienceMotionSample[] }
  ).__sekretAudienceMotionSamples ?? []);

  const teen = (await read()).filter(sample => sample.audience === 'teen');
  expect(teen.length).toBeGreaterThan(4);
  expect(teen.some(sample => sample.copy < 0.95)).toBe(true);
  expect(teen.some(sample => sample.hero < 0.95)).toBe(true);
  expect(teen.some(sample => sample.cues < 0.95)).toBe(true);
  for (const value of ['copy', 'hero', 'cues'] as const) {
    expect(teen.at(-1)![value]).toBeGreaterThanOrEqual(0.99);
  }

  await page.getByTestId('web-welcome-audience-switch').click();
  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
  await page.waitForTimeout(1100);
  const jr = (await read()).filter(sample => sample.audience === 'bip-jr');
  expect(jr.length).toBeGreaterThan(4);
  expect(jr.some(sample => sample.hero < 0.95)).toBe(true);
  for (const value of ['copy', 'hero', 'cues'] as const) {
    expect(jr.at(-1)![value]).toBeGreaterThanOrEqual(0.99);
  }
  await expect(page.getByTestId('web-welcome-hero-teen')).toHaveCount(0);
  await expect(page.getByTestId('web-welcome-enter'))
    .toHaveAccessibleName('Bip Jr family welcome — continue to family setup');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  await testInfo.attach('bip-jr-family-reveal-390x844.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});

test('reduced motion renders both audience scenes still with working family access', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?bipDevAudience=teen', { waitUntil: 'domcontentloaded' });
  const opacity = () => page.evaluate(() => ['web-welcome-copy-reveal', 'web-welcome-hero-reveal', 'web-welcome-world-cues'].map(id => {
    const node = document.querySelector('[data-testid="' + id + '"]');
    return node ? Number.parseFloat(getComputedStyle(node).opacity) : null;
  }));
  await expect(page.getByTestId('web-welcome-hero-teen')).toBeVisible({ timeout: 30_000 });
  expect(await opacity()).toEqual([1, 1, 1]);
  await page.getByTestId('web-welcome-audience-switch').click();
  await expect(page.getByTestId('web-welcome-hero-bip-jr')).toBeVisible();
  expect(await opacity()).toEqual([1, 1, 1]);
  await page.waitForTimeout(450);
  expect(await opacity()).toEqual([1, 1, 1]);
  await expect(page.getByTestId('web-welcome-enter')).toBeVisible();
});
