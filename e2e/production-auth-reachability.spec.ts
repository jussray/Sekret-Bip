import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

function readProductionEnv(): Record<string, string> {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), '.env.production'),
    'utf8',
  );

  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator === -1) return [line, ''];
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const productionEnv = readProductionEnv();
const supabaseUrl = productionEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  productionEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  productionEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type BrowserProbe = {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  error: string;
};

test('production browser validates the Supabase publishable key and reaches Auth read-only', async ({
  page,
}) => {
  expect(supabaseUrl).toMatch(/^https:\/\/[a-z0-9]+\.supabase\.co$/);
  expect(supabasePublishableKey).toMatch(/^(sb_publishable_|eyJ)/);
  expect(supabasePublishableKey).not.toMatch(/^sb_secret_/);

  await page.goto('/signup?side=teen');

  const probes = await page.evaluate(
    async ({ url, key }) => {
      const read = async (
        pathname: string,
        headers: Record<string, string>,
      ): Promise<BrowserProbe> => {
        try {
          const response = await fetch(`${url}${pathname}`, {
            method: 'GET',
            headers,
          });
          const body = await response.text();

          return {
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type') ?? '',
            body: body.slice(0, 2_000),
            error: '',
          };
        } catch (error) {
          return {
            ok: false,
            status: 0,
            contentType: '',
            body: '',
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

      return {
        withoutKey: await read('/auth/v1/settings', {
          Accept: 'application/json',
        }),
        auth: await read('/auth/v1/settings', {
          apikey: key,
          Accept: 'application/json',
        }),
      };
    },
    { url: supabaseUrl, key: supabasePublishableKey },
  );

  expect([401, 403], JSON.stringify(probes.withoutKey)).toContain(probes.withoutKey.status);
  expect(probes.withoutKey.ok, JSON.stringify(probes.withoutKey)).toBe(false);

  expect(probes.auth.status, JSON.stringify(probes.auth)).toBe(200);
  expect(probes.auth.ok, JSON.stringify(probes.auth)).toBe(true);
  expect(probes.auth.contentType).toContain('application/json');
  expect(probes.auth.body).not.toContain(supabasePublishableKey);
  expect(probes.auth.body).not.toMatch(/sb_secret_|service[_-]?role/i);
});
