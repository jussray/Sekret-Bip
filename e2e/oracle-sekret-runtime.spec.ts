import { expect, test } from '@playwright/test';

const apiOrigin = process.env.SEKRET_E2E_API_ORIGIN?.trim().replace(/\/$/, '');
const bearerToken = process.env.SEKRET_E2E_BEARER_TOKEN?.trim();
const requestOrigin = process.env.SEKRET_E2E_ORIGIN?.trim() || 'https://app.sekretbip.net';

test.describe('Oracle compatibility → Se’kret runtime', () => {
  test.skip(
    !apiOrigin || !bearerToken,
    'Controlled live proof requires SEKRET_E2E_API_ORIGIN and SEKRET_E2E_BEARER_TOKEN.',
  );

  test('legacy Oracle input reaches the canonical Se’kret empathy/accountability runtime', async ({ request }) => {
    const response = await request.post(`${apiOrigin}/api/sekret/reply`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Origin: requestOrigin,
        'Content-Type': 'application/json',
      },
      data: {
        characterId: 'oracle',
        surface: 'journal',
        userText: 'I lied because I was scared. Help me think about the honest next step without pretending the lie was okay.',
        history: [],
      },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const body = await response.json() as Record<string, unknown>;

    expect(body.characterId).toBe('sekret');
    expect(body.actorId).toBe('sekret');
    expect(body.actorRole).toBe('continuity-presence');
    expect(body.textStyleVersion).toBe('sekret-presence-text-v1');
    expect(body.styleEnforced).toBe(true);
    expect(body.questionBudget).toBe(0);
    expect(String(body.reply ?? '')).not.toMatch(/\boracle\b/i);
  });
});
