import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const founderAudit = read('src/services/founderAudit.ts');
const businessScreen = read('src/screens/FounderBusinessScreen.tsx');
const businessRoute = read('app/business/index.tsx');

test('business access uses the durable Supabase founder profile instead of a hard-coded email', () => {
  assert.match(founderAudit, /profile\?\.role === 'founder'/);
  assert.match(founderAudit, /profile\.can_manage_app/);
  assert.match(founderAudit, /profile\.can_view_audits/);
  assert.match(founderAudit, /\.from\('app_profiles'\)/);
  assert.doesNotMatch(founderAudit, /sekretbip@gmail\.com/);
  assert.doesNotMatch(businessScreen, /sekretbip@gmail\.com/);
});

test('private business route fails closed and stays separate from public, teen, and parent surfaces', () => {
  assert.match(businessRoute, /FounderBusinessScreen/);
  assert.match(businessScreen, /isFounderBusinessProfile\(profile\)/);
  assert.match(businessScreen, /Founder access required/);
  assert.match(businessScreen, /router\.replace\('\/'\)/);
  assert.doesNotMatch(businessScreen, /setUserSide/);
  assert.equal(fs.existsSync(new URL('../app/(business)/index.tsx', import.meta.url)), false);
});

test('founder dashboard reports only trustworthy operational summaries', () => {
  assert.match(founderAudit, /getFounderBusinessSnapshot/);
  assert.match(founderAudit, /control_room_issues/);
  assert.match(founderAudit, /audit_events/);
  assert.match(founderAudit, /control_room_releases/);
  assert.match(founderAudit, /\.neq\('status', 'ignored'\)/);
  assert.doesNotMatch(founderAudit, /app_profiles'\)\.select\('user_id', \{ count: 'exact'/);
  assert.match(businessScreen, /Unavailable/);
  assert.match(businessScreen, /Open Control Room/);
  assert.match(businessScreen, /\/control-room/);
  assert.doesNotMatch(businessScreen, /\/dev\/control-room/);
  assert.match(businessScreen, /Planned · no live tool yet/);
  assert.doesNotMatch(businessScreen, /Foundation connected/);
});
