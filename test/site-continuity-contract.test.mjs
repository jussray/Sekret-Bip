import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const continuitySource = await readFile(new URL('../src/features/control-room/siteContinuity.ts', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../src/features/control-room/SiteContinuityPanel.tsx', import.meta.url), 'utf8');
const screenSource = await readFile(new URL('../src/screens/DevControlRoomScreen.tsx', import.meta.url), 'utf8');
const sitesContract = await readFile(new URL('../SITES.md', import.meta.url), 'utf8');

test('site continuity binds the exact Se’kret Bip audit mirror without browser cookies', () => {
  const origin = 'https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site';
  const auditView = `${origin}/control-room`;

  assert.match(continuitySource, /juss\/chatgpt-site-continuity-cookie@v1/);
  assert.ok(continuitySource.includes(`siteOrigin: '${origin}'`));
  assert.ok(continuitySource.includes(`auditViewLink: '${auditView}'`));
  assert.match(continuitySource, /siteRole: 'audit-mirror'/);
  assert.match(continuitySource, /authority: 'observe-request-only'/);
  assert.match(continuitySource, /browserCookie: false/);
  assert.match(continuitySource, /livePublicationReadback: 'UNKNOWN'/);

  assert.ok(sitesContract.includes(`site_origin: ${origin}`));
  assert.ok(sitesContract.includes(`audit_view_link: ${auditView}`));
});

test('founder Control Room visibly uses the fingerprint and continuity cookie', () => {
  assert.match(panelSource, /SITE_CONTINUITY_COOKIE/);
  assert.match(panelSource, /SITE_CONTINUITY_FINGERPRINT/);
  assert.match(panelSource, /Continuity fingerprint/);
  assert.match(panelSource, /Continuity cookie/);
  assert.match(screenSource, /SiteContinuityPanel/);
  assert.match(screenSource, /'site-continuity'/);
  assert.match(screenSource, /\['site-continuity', 'Site'\]/);
});
