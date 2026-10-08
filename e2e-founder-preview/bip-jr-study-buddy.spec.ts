import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test.describe('Bip Jr Study Buddy (parent-supervised)', () => {
  // The first route compiles the Metro web bundle on a cold dev server.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('Bip Jr page opens Study Buddy without adding a parent tab', async ({ page }, testInfo) => {
    await page.goto('/bip-jr');

    const entry = page.getByRole('button', { name: 'Open Study Buddy practice' });
    await expect(entry).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('tab', { name: /bip-jr-study/i })).toHaveCount(0);
    await capture(page, testInfo, 'bip-jr-entry');

    await entry.click();
    await expect(page).toHaveURL(/\/bip-jr-study(?:\?.*)?$/);
    await expect(page.getByTestId('study-safety-banner')).toContainText('sends nothing to an AI service');

    await page.getByRole('button', { name: 'Back within parent side' }).click();
    await expect(page).toHaveURL(/\/bip-jr(?:\?.*)?$/);
    await expect(entry).toBeVisible();
  });

  test('a supervised practice round checks answers, keeps progress on the device, and calls no service', async ({ page }, testInfo) => {
    const external: string[] = [];
    page.on('request', request => {
      const host = new URL(request.url()).hostname;
      if (!['127.0.0.1', 'localhost'].includes(host) && !request.url().startsWith('data:')) external.push(request.url());
    });

    await page.goto('/bip-jr-study');
    const mission = page.getByTestId('study-mission');
    await expect(mission).toContainText('Count and add', { timeout: 30_000 });
    await expect(page.getByTestId('study-progress')).toContainText('0 of 2 finished');
    await expect(page.getByTestId('study-check-button')).toHaveAttribute('aria-disabled', 'true');

    await page.getByTestId('study-choice-a').click();
    await page.getByTestId('study-check-button').click();
    await expect(page.getByTestId('study-feedback-try_again')).toBeVisible();
    await expect(page.getByTestId('study-hint')).toContainText('Count on from 3');
    await expect(page.getByTestId('study-progress')).toContainText('0 of 2 finished');

    await page.getByTestId('study-choice-b').click();
    await page.getByTestId('study-check-button').click();
    await expect(page.getByTestId('study-feedback-correct')).toContainText('Three plus two equals five.');
    await expect(mission).toContainText('Show 5 with blocks, socks, or fingers.');
    await expect(page.getByTestId('study-progress')).toContainText('1 of 2 finished');
    await expect(page.getByTestId('study-save-error')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, 'study-correct');

    await page.getByTestId('study-next-button').click();
    await expect(mission).toContainText('Which has more?');

    await page.reload();
    await expect(page.getByTestId('study-progress')).toContainText('1 of 2 finished', { timeout: 30_000 });
    await expect(mission).toContainText('Which has more?');

    // Finishing the subject must not trap Next on the warm-up.
    await page.getByTestId('study-choice-a').click();
    await page.getByTestId('study-check-button').click();
    await expect(page.getByTestId('study-progress')).toContainText('2 of 2 finished');
    await page.getByTestId('study-next-button').click();
    await expect(mission).toContainText('Count and add');
    await page.getByTestId('study-choice-b').click();
    await page.getByTestId('study-check-button').click();
    await page.getByTestId('study-next-button').click();
    await expect(mission).toContainText('Which has more?');

    await page.getByTestId('study-age-11-12').click();
    await page.getByTestId('study-subject-language').click();
    await expect(page.getByTestId('study-progress')).toContainText('0 of 2 finished');
    await expect(page.getByTestId('study-mode-adult_mission')).toContainText('LOCKED');
    await expect(page.getByTestId('study-mode-classroom_activity')).toContainText('LOCKED');
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, 'study-11-12-language');

    // Shared device practice comes back on the age range and subject it last used.
    await expect(mission).toContainText('Useful conversation');
    await page.getByTestId('study-choice-a').click();
    await page.getByTestId('study-check-button').click();
    await expect(page.getByTestId('study-feedback-correct')).toBeVisible();
    await page.reload();
    await expect(mission).toContainText('REASON IT THROUGH', { timeout: 30_000 });
    await expect(mission).toContainText('Choose the response');

    expect(external, 'Study Buddy must not reach any external service').toEqual([]);
  });

  test('practice for a child profile is handed over on the device, kept separate, and never in the URL', async ({ page }) => {
    const childA = { id: '2f1c6c1e-1111-4a2b-9c3d-00000000000a', ageBand: '8-10' };
    const childB = { id: '2f1c6c1e-1111-4a2b-9c3d-00000000000b', ageBand: '8-10' };
    const urls: string[] = [];
    page.on('request', request => urls.push(request.url()));

    async function openFor(child: object | string | null) {
      await page.goto('/bip-jr');
      await expect(page.getByRole('button', { name: 'Open Study Buddy practice' })).toBeVisible({ timeout: 30_000 });
      await page.evaluate(value => {
        if (value === null) window.localStorage.removeItem('jr_study_active_child_v1');
        else window.localStorage.setItem('jr_study_active_child_v1', typeof value === 'string' ? value : JSON.stringify(value));
      }, child);
      await page.goto('/bip-jr-study');
    }

    const mission = page.getByTestId('study-mission');
    await openFor(childA);
    await expect(page.getByTestId('study-scope')).toContainText('Progress is kept for this child only', { timeout: 30_000 });
    await expect(page.getByTestId('study-age-8-10')).toHaveCount(0);
    await expect(mission).toContainText('TRY IT, THEN EXPLAIN IT');
    for (const choice of ['a', 'b', 'c', 'd']) {
      if (await page.getByTestId('study-feedback-correct').count()) break;
      if (!(await page.getByTestId(`study-choice-${choice}`).count())) continue;
      await page.getByTestId(`study-choice-${choice}`).click();
      await page.getByTestId('study-check-button').click();
    }
    await expect(page.getByTestId('study-feedback-correct')).toBeVisible();
    await expect(page.getByTestId('study-progress')).toContainText('1 of 2 finished');

    await openFor(childB);
    await expect(page.getByTestId('study-progress')).toContainText('0 of 2 finished', { timeout: 30_000 });

    // The last subject a child practiced is restored when they come back.
    await page.getByTestId('study-subject-reading').click();
    await expect(mission).toContainText('Main idea finder');
    await page.getByTestId('study-choice-a').click();
    await page.getByTestId('study-check-button').click();
    await expect(page.getByTestId('study-feedback-correct')).toBeVisible();
    await page.reload();
    await expect(mission).toContainText('Context clue search', { timeout: 30_000 });

    // Device practice after a child's session starts from the default subject.
    await openFor(null);
    await expect(page.getByTestId('study-scope')).toContainText('Not linked to a child profile', { timeout: 30_000 });
    await expect(mission).toContainText('Count and add');

    await openFor(childA);
    await expect(page.getByTestId('study-progress')).toContainText('1 of 2 finished', { timeout: 30_000 });

    await openFor({ id: '../escape', ageBand: '8-10' });
    await expect(page.getByTestId('study-scope')).toContainText('Not linked to a child profile', { timeout: 30_000 });

    for (const url of urls) {
      expect(url, 'child identifiers must never appear in a request URL').not.toContain('2f1c6c1e-1111-4a2b-9c3d');
      expect(new URL(url).pathname.startsWith('/bip-jr-study') ? new URL(url).search : '').toBe('');
    }
  });
});
