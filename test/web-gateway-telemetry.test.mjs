import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('telemetry module exports trackAnalyticsEvent and writes to analytics_events table', async () => {
  const source = await read('src/utils/telemetry.ts');
  assert.match(source, /export async function trackAnalyticsEvent/);
  assert.match(source, /analytics_events/);
  assert.match(source, /signup_attempted/);
  assert.match(source, /teen_age_selected/);
});

test('signup screen instruments signup_attempted telemetry', async () => {
  const source = await read('app/(auth)/signup.tsx');
  assert.match(source, /trackAnalyticsEvent/);
  assert.match(source, /signup_attempted/);
  assert.match(source, /side:\s*preferredSide/);
});

test('welcome onboarding screen instruments teen_age_selected telemetry', async () => {
  const source = await read('app/(onboarding)/welcome.tsx');
  assert.match(source, /trackAnalyticsEvent/);
  assert.match(source, /teen_age_selected/);
});

test('find-family doorway route enforces safety disclaimers and recommendation contracts', async () => {
  const source = await read('app/find-family.tsx');
  assert.match(source, /Find your doorway/);
  assert.match(source, /Suggestions don’t verify age or grant access/);
  assert.match(source, /recommendDestination/);
  assert.match(source, /Bip Jr\. \+ Family/);
  assert.match(source, /Teen Space/);
});

test('front door web welcome screen integrates doorway helper link', async () => {
  const source = await read('screens/WebWelcomeScreen.tsx');
  assert.match(source, /web-welcome-find-doorway/);
  assert.match(source, /\/find-family/);
});

test('web-gateway migration provisions public.analytics_events insert access', async () => {
  const sql = await read('supabase/migrations/20261122040000_web_gateway_telemetry_and_family_links.sql');
  assert.match(sql, /create table if not exists public\.analytics_events/);
  assert.match(sql, /grant insert on public\.analytics_events to anon, authenticated/);
  assert.match(sql, /grant select on public\.analytics_events to authenticated/);
});
