import { expect, test, type Page, type TestInfo } from '@playwright/test';

const MEMORY_KEY = 'sekret_companion_memory';
const DISMISSED_KEY = 'sekret_wellbeing_dismissed_v1';
const MOOD_OBSERVATION = 'You have logged “heavy” more than once.';

async function seedPrivateActivity(page: Page) {
  await page.addInitScript(({ memoryKey, dismissedKey }) => {
    window.localStorage.setItem('userSide', 'teen');
    window.localStorage.setItem('selectedSekret', 'raylene');
    window.localStorage.removeItem(dismissedKey);
    window.localStorage.setItem(memoryKey, JSON.stringify({
      moodHistory: [
        { sourceId: 'mood-1', mood: 'heavy', date: '2026-09-13' },
        { sourceId: 'mood-2', mood: 'heavy', date: '2026-09-14' },
        { sourceId: 'mood-3', mood: 'heavy', date: '2026-09-15' },
      ],
      journalActivity: [
        { sourceId: 'journal-1', mood: 'heavy', topics: ['school'], date: '2026-09-13' },
        { sourceId: 'journal-2', mood: 'heavy', topics: ['school'], date: '2026-09-15' },
      ],
      voiceBips: [],
      comfortUsage: [
        { sourceId: 'comfort-1', type: 'breathe', date: '2026-09-14' },
        { sourceId: 'comfort-2', type: 'breathe', date: '2026-09-15' },
      ],
      streaks: { current: 2, longest: 3, lastUpdated: '2026-09-15' },
      selectedPersonality: 'raylene',
      recurringTopics: ['school'],
      comfortWordHistory: [],
      deferredGoalHistory: [],
      winHistory: [],
      lastUpdated: '2026-09-15T12:00:00.000Z',
    }));
  }, { memoryKey: MEMORY_KEY, dismissedKey: DISMISSED_KEY });
}

test('history reflects repeated private activity without diagnosis and lets the teen reject an observation', async ({ page }, testInfo: TestInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedPrivateActivity(page);

  await page.goto('/history?bipDevSide=teen', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText("What Se'kret is noticing", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('These are observations, not diagnoses. You can reject any one.', { exact: false })).toBeVisible();
  await expect(page.getByText(MOOD_OBSERVATION, { exact: true })).toBeVisible();
  await expect(page.getByText('“school” keeps showing up in your reflections.', { exact: true })).toBeVisible();
  await expect(page.getByText('You have come back to “breathe” more than once.', { exact: true })).toBeVisible();
  await expect(page.getByText(/depress|disorder|diagnos(ed|is)|risk score/i)).toHaveCount(0);

  await testInfo.attach('passive-wellbeing-history-mobile.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });

  const reject = page.getByRole('button', { name: `Reject observation: ${MOOD_OBSERVATION}`, exact: true });
  await expect(reject).toBeVisible();
  const box = await reject.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await reject.click();

  await expect(page.getByTestId('wellbeing-correction-error')).toHaveCount(0);
  await expect(page.getByText(MOOD_OBSERVATION, { exact: true })).toHaveCount(0);
  const dismissed = await page.evaluate(key => window.localStorage.getItem(key), DISMISSED_KEY);
  expect(dismissed).not.toBeNull();
  expect(JSON.parse(dismissed!)).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'mood:heavy' }),
  ]));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText("What Se'kret is noticing", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(MOOD_OBSERVATION, { exact: true })).toHaveCount(0);
  await expect(page.getByText('“school” keeps showing up in your reflections.', { exact: true })).toBeVisible();
});
