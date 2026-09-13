import { expect, test, type APIRequestContext } from '@playwright/test';

const apiOrigin = process.env.SEKRET_E2E_API_ORIGIN?.trim().replace(/\/$/, '');
const bearerToken = process.env.SEKRET_E2E_BEARER_TOKEN?.trim();
const requestOrigin = process.env.SEKRET_E2E_ORIGIN?.trim() || 'https://app.sekretbip.net';

async function assertInternalReplyPrivacy(
  request: APIRequestContext,
  characterId: 'oracle' | 'sekret',
) {
  const response = await request.post(`${apiOrigin}/api/sekret/reply`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Origin: requestOrigin,
      'Content-Type': 'application/json',
    },
    data: {
      characterId,
      surface: 'journal',
      userText: 'I lied because I was scared. Help me think about the honest next step without pretending the lie was okay.',
      history: [],
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json() as Record<string, unknown>;

  expect(body.characterId).toBeUndefined();
  expect(body.actorId).toBeUndefined();
  expect(body.actorRole).toBe('continuity-presence');
  expect(body.textStyleVersion).toBe('internal-presence-text-v1');
  expect(body.styleEnforced).toBe(true);
  expect(body.internalIdentityApplied).toBe(true);
  expect(body.questionBudget).toBe(0);
  expect(String(body.reply ?? '')).not.toMatch(/\b(?:oracle|joseema|se[’']?kret)\b/i);
}

test.describe('internal honor runtime privacy', () => {
  test.skip(
    !apiOrigin || !bearerToken,
    'Controlled live proof requires SEKRET_E2E_API_ORIGIN and SEKRET_E2E_BEARER_TOKEN.',
  );

  test('legacy Oracle input reaches the internal compatibility lens without exposing identity', async ({ request }) => {
    await assertInternalReplyPrivacy(request, 'oracle');
  });

  test('Se’kret internal input remains distinct and hidden from client metadata', async ({ request }) => {
    await assertInternalReplyPrivacy(request, 'sekret');
  });
});
