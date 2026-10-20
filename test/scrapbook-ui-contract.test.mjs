import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

const component = read('components/rooms/ScrapbookCompanionScene.tsx');
const route = read('app/(teen)/scrapbook-check-in.tsx');
const room = read('app/(teen)/room.tsx');
const pages = read('app/(teen)/pages/index.tsx');
const layout = read('app/(teen)/_layout.tsx');
const routes = read('src/teen/routes.ts');
const canon = read('docs/SCRAPBOOK_UI_CANON.md');
const e2e = read('e2e/scrapbook-companion-check-in.spec.ts');
const workflow = read('.github/workflows/product-design-playwright-proof.yml');

test('scrapbook check-in is a hidden immersive teen route launched below the Room canvas', () => {
  assert.match(routes, /scrapbookCheckIn:\s*'\/\(teen\)\/scrapbook-check-in'/);
  assert.match(layout, /<Tabs\.Screen name="scrapbook-check-in" options=\{\{ href: null \}\} \/>/);
  assert.match(layout, /const immersiveScrapbook = pathname\.includes\('scrapbook-check-in'\)/);
  assert.match(layout, /const hideGlobalChrome = quietActive \|\| immersive/);
  assert.match(room, /ScrapbookCheckInLauncher/);
  assert.match(room, /testID="scrapbook-check-in-footer"/);
  assert.match(room, /TEEN_ROUTES\.scrapbookCheckIn/);

  const launcherStyle = component.slice(
    component.indexOf('launcher: {'),
    component.indexOf('launcherTape: {'),
  );
  assert.doesNotMatch(launcherStyle, /position:\s*'absolute'/);
});

test('scene handoff preserves the requested companion and existing Pages destination', () => {
  assert.match(route, /selectedSekret/);
  assert.match(route, /setSelectedSekret/);
  assert.match(route, /useLocalSearchParams/);
  assert.match(route, /requestedCompanion \?\? selectedSekret/);
  assert.match(route, /normalizeScrapbookCompanion/);
  assert.match(route, /setSelectedSekret\(companionKey\)/);
  assert.match(pages, /useLocalSearchParams/);
  assert.match(pages, /useFocusEffect\(useCallback/);
  assert.match(pages, /requestedCompanion/);
  assert.match(pages, /setActiveTab\(nextCompanion\)/);
  assert.match(pages, /setSelectedSekret\(nextCompanion\)/);
  assert.match(pages, /router\.setParams\(\{ companion: '' \}\)/);
  assert.doesNotMatch(pages, /\[activeTab, requestedCompanion, selectedSekret/);
  assert.match(route, /pathname:\s*TEEN_ROUTES\.pages/);
  assert.match(route, /params:\s*\{ companion: companionKey \}/);
  assert.doesNotMatch(route, /companion-chat/);
});

test('Rain continuity and time phase refresh remain live while the scene is mounted', () => {
  assert.match(component, /getRoomPhase\(new Date\(\), rainOverride \? 'rain' : undefined\)/);
  assert.match(component, /AppState\.addEventListener\('change'/);
  assert.match(component, /setInterval\(refresh, 60_000\)/);
  assert.match(component, /useScrapbookPhase\(rainOverride\)/);
  assert.match(route, /rainOverride=\{theme === 'rain'\}/);
  assert.match(room, /rainOverride=\{vibe === 'rain'\}/);
  assert.match(component, /useWindowDimensions\(\)/);
  assert.match(component, /const compact = viewportHeight < 700/);
  assert.match(component, /photoWellCompact/);

  const overlayIndex = room.indexOf('<BipReturnOverlay');
  const footerIndex = room.indexOf('testID="scrapbook-check-in-footer"');
  assert.ok(overlayIndex > 0 && footerIndex > 0 && overlayIndex < footerIndex,
    'BipReturnOverlay must remain inside the Room canvas before the scrapbook footer');
});

test('visible peer companion canon stays Suhana, Sy, Cloud, and Night while Ja remains distinct', () => {
  assert.match(component, /raylene:\s*'Suhana'/);
  assert.match(component, /rylane:\s*'Sy'/);
  assert.match(component, /cloud:\s*'Cloud'/);
  assert.match(component, /night:\s*'Night'/);
  assert.doesNotMatch(component, /['"`]Raylene['"`]/);
  assert.doesNotMatch(component, /['"`]Rylane['"`]/);
  assert.match(canon, /Ja remains part of the Bip world/);
  assert.match(canon, /continuity presence/);
});

test('approved scrapbook visual grammar and evening receipt remain wired', () => {
  assert.match(component, /getRoomScene\(character, phase\)/);
  assert.match(component, /you made it through today\./);
  assert.match(component, /scrapbook-companion-scene/);
  assert.match(component, /scrapbook-bip-cta/);
  assert.match(component, /scrapbook-check-in-launcher/);

  for (const motif of ['sketchbook-paper', 'masking-tape', 'Polaroid', 'doodles', 'cozy dark-mode', 'time-of-day']) {
    assert.match(canon, new RegExp(motif, 'i'));
  }
});

test('approved Sy evening reference is retained at the design evidence path', () => {
  const referencePath = 'docs/design/reference/scrapbook-evening-sy-reference.jpg';
  assert.equal(existsSync(referencePath), true, `${referencePath} must exist`);
  assert.match(canon, /Sy — Evening Check-In/);
  assert.match(canon, /390 × 844/);
  assert.match(canon, /Design QA status:\s*\*\*blocked/i);
});

test('Product Design proof captures the actual Sy evening route and proves the Pages handoff', () => {
  assert.match(workflow, /e2e\/scrapbook-companion-check-in\.spec\.ts/);
  assert.match(e2e, /width:\s*390,\s*height:\s*844/);
  assert.match(e2e, /Date\.prototype,\s*'getHours'/);
  assert.match(e2e, /value:\s*\(\) => 18/);
  assert.match(e2e, /\/scrapbook-check-in\?bipDevSide=teen&companion=sy/);
  assert.match(e2e, /EVENING CHECK-IN/);
  assert.match(e2e, /you made it through today\./);
  assert.match(e2e, /sy-evening-390x844\.png/);
  assert.match(e2e, /width:\s*320,\s*height:\s*568/);
  assert.match(e2e, /sy-evening-320x568\.png/);
  assert.match(e2e, /toHaveAccessibleName\('Bip with Sy'\)/);
  assert.match(e2e, /SE'KRET PAGES/);
  assert.match(e2e, /getByText\('Sy'/);
});
