import { expect, test } from '@playwright/test';

test('Family Visit renders its non-surveillance boundary and stays fail-closed without capture', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript(() => {
    const state = window as Window & { __bipGetUserMediaCalls?: number };
    state.__bipGetUserMediaCalls = 0;

    const recordCall = async () => {
      state.__bipGetUserMediaCalls = (state.__bipGetUserMediaCalls ?? 0) + 1;
      throw new DOMException('Media capture is not available in Family Visit proof.', 'NotAllowedError');
    };

    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: recordCall,
      });
    } else {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: recordCall },
      });
    }
  });

  await page.goto('/bridge-family-visit', { waitUntil: 'networkidle' });

  await expect(page.getByText('FAMILY VISIT MODE', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('A visit support space, not surveillance.', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Se’kret is not recording. This session only uses the moments and reflections participants choose to add.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('🔐 What this mode never does', { exact: true })).toBeVisible();
  await expect(page.getByText('• No hidden microphone, camera, transcript, or background listening.', { exact: true })).toBeVisible();
  await expect(page.getByText('Family Visit Mode is not configured yet.', { exact: true })).toBeVisible();

  const captureCalls = await page.evaluate(() => (
    (window as Window & { __bipGetUserMediaCalls?: number }).__bipGetUserMediaCalls ?? 0
  ));
  expect(captureCalls).toBe(0);

  await testInfo.attach('bridge-family-visit-privacy-boundary.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});
