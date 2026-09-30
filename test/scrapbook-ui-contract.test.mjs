import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const componentPath = 'components/rooms/ScrapbookCompanionScene.tsx';
const routePath = 'app/(teen)/scrapbook-check-in.tsx';
const roomPath = 'app/(teen)/room.tsx';
const layoutPath = 'app/(teen)/_layout.tsx';
const routesPath = 'src/teen/routes.ts';
const canonPath = 'docs/SCRAPBOOK_UI_CANON.md';
const referencePath = 'docs/design/reference/scrapbook-evening-sy-reference.jpg';

const component = readFileSync(componentPath, 'utf8');
const route = readFileSync(routePath, 'utf8');
const room = readFileSync(roomPath, 'utf8');
const layout = readFileSync(layoutPath, 'utf8');
const routes = readFileSync(routesPath, 'utf8');
const canon = readFileSync(canonPath, 'utf8');

test('scrapbook check-in is registered as a hidden teen route and launched from Room', () => {
  assert.match(routes, /scrapbookCheckIn:\s*'\/\(teen\)\/scrapbook-check-in'/);
  assert.match(layout, /<Tabs\.Screen name="scrapbook-check-in" options=\{\{ href: null \}\} \/>/);
  assert.match(room, /ScrapbookCheckInLauncher/);
  assert.match(room, /TEEN_ROUTES\.scrapbookCheckIn/);
});

test('scrapbook scene reuses the current companion and existing Pages destination', () => {
  assert.match(route, /selectedSekret/);
  assert.match(route, /normalizeScrapbookCompanion/);
  assert.match(route, /pathname:\s*TEEN_ROUTES\.pages/);
  assert.match(route, /params:\s*\{ companion: companionKey \}/);
  assert.doesNotMatch(route, /companion-chat/);
});

test('visible companion canon stays Suhana, Sy, Cloud, and Night while legacy ids remain compatibility-only', () => {
  assert.match(component, /raylene:\s*'Suhana'/);
  assert.match(component, /rylane:\s*'Sy'/);
  assert.match(component, /cloud:\s*'Cloud'/);
  assert.match(component, /night:\s*'Night'/);
  assert.doesNotMatch(component, /['"`]Raylene['"`]/);
  assert.doesNotMatch(component, /['"`]Rylane['"`]/);
});

test('approved scrapbook visual grammar and time-of-day behavior remain wired', () => {
  assert.match(component, /getRoomPhase\(new Date\(\)\)/);
  assert.match(component, /getRoomScene\(character, phase\)/);
  assert.match(component, /you made it through today\./);
  assert.match(component, /scrapbook-companion-scene/);
  assert.match(component, /scrapbook-bip-cta/);
  assert.match(component, /scrapbook-check-in-launcher/);

  for (const motif of ['sketchbook-paper', 'masking-tape', 'Polaroid', 'doodles', 'cozy dark-mode', 'time-of-day']) {
    assert.match(canon, new RegExp(motif, 'i'));
  }
});

test('approved Sy evening reference is checked into the design evidence path', () => {
  assert.equal(existsSync(referencePath), true, `${referencePath} must exist`);
  assert.match(canon, /Sy — Evening Check-In/);
  assert.match(canon, /390 × 844/);
  assert.match(canon, /Design QA status:\s*\*\*blocked/i);
});
