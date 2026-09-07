import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  ));
  expect(overflow).toBe(false);
}

test('AI search definition page is crawlable, extractable, and privacy-bounded', async ({ page, request }, testInfo) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Disallow: /');
  expect(robots).toContain('Allow: /what-is-sekret-bip/');
  expect(robots).toContain('Allow: /how-it-works/');
  expect(robots).toContain('Sitemap: https://sekretbip.net/sitemap.xml');

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain('<loc>https://sekretbip.net/what-is-sekret-bip/</loc>');
  expect(sitemap).toContain('<loc>https://sekretbip.net/how-it-works/</loc>');

  await page.goto('/what-is-sekret-bip/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle("What is Se'kret Bip? | Private, age-aware family communication");
  await expect(page.getByRole('heading', { level: 1, name: "What is Se'kret Bip?" })).toBeVisible();
  await expect(page.getByText(/Se'kret Bip is a private, age-aware digital space for young people and families/).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: "What Se'kret Bip is not" })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Privacy and public discovery' })).toBeVisible();

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sekretbip.net/what-is-sekret-bip/',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /private, age-aware digital space/i,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/i);

  const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLdText).toBeTruthy();
  const jsonLd = JSON.parse(jsonLdText ?? '{}') as {
    '@graph'?: Array<Record<string, unknown>>;
  };
  const graph = jsonLd['@graph'] ?? [];
  expect(graph.some(entity => entity['@type'] === 'SoftwareApplication' && entity.name === "Se'kret Bip")).toBe(true);
  expect(graph.some(entity => entity['@type'] === 'FAQPage')).toBe(true);

  const bodyText = await page.locator('body').innerText();
  for (const forbidden of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'ACCOUNT_DELETION_PROCESS_SECRET',
    'SAFETY_SCAN_SECRET',
    'app_private_config',
  ]) {
    expect(bodyText).not.toContain(forbidden);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('ai-search-what-is-sekret-bip-mobile.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});

test('how-it-works page exposes the verified entry model without opening private routes', async ({ page }, testInfo) => {
  await page.goto('/how-it-works/index.html', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle("How Se'kret Bip works | Teen and family paths");
  await expect(page.getByRole('heading', { level: 1, name: "How Se'kret Bip works" })).toBeVisible();
  await expect(page.getByText(/choose the doorway that fits the person using Se'kret Bip/i)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'The four-step path' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Choose Teen or Bip Jr + Family' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Complete age-aware setup' })).toBeVisible();
  await expect(page.getByText(/Teen entry continues to an age question before account fields/)).toBeVisible();
  await expect(page.getByText(/Bip Jr \+ Family continues to family setup with a grown-up/).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Public explanation, private participation' })).toBeVisible();

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sekretbip.net/how-it-works/',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /choose the Teen or Bip Jr \+ Family path/i,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/i);

  const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
  expect(jsonLdText).toBeTruthy();
  const jsonLd = JSON.parse(jsonLdText ?? '{}') as {
    '@graph'?: Array<Record<string, unknown>>;
  };
  const graph = jsonLd['@graph'] ?? [];
  const howTo = graph.find(entity => entity['@type'] === 'HowTo') as {
    step?: Array<Record<string, unknown>>;
  } | undefined;
  expect(howTo).toBeTruthy();
  expect(howTo?.step).toHaveLength(4);
  expect(graph.some(entity => entity['@type'] === 'FAQPage')).toBe(true);

  const bodyText = await page.locator('body').innerText();
  for (const forbidden of [
    'SUPABASE_SERVICE_ROLE_KEY',
    'ACCOUNT_DELETION_PROCESS_SECRET',
    'SAFETY_SCAN_SECRET',
    'app_private_config',
  ]) {
    expect(bodyText).not.toContain(forbidden);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('ai-search-how-it-works-mobile.png', {
    body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
    contentType: 'image/png',
  });
});
