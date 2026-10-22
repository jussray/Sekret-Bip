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
const e2ePath = 'e2e/scrapbook-companion-check-in.spec.ts';
const workflowPath = '.github/workflows/product-design-playwright-proof.yml';

const component = readFileSync(componentPath, 'utf8');
const route = readFileSync(routePath, 'utf8');
const room = readFileSync(roomPath, 'utf8');
const layout = readFileSync(layoutPath, 'utf8');
const routes = readFileSync(routesPath, 'utf8');
const canon = readFileSync(canonPath, 'utf8');
const e2e = readFileSync(e2ePath, 'utf8');
const workflow = readFileSync(workflowPath, 'utf8');

test('scrapbook check-in is registered as a hidden teen route and launched from Room', () => {
  assert.match(routes, /scrapbookCheckIn:\s*'\/\(teen\)\/scrapbook-check-in'/);
  assert.match(layout, /<Tabs\.Screen name="scrapbook-check-in" options=\{\{ href: null \}\} \/>/);
  assert.match(room, /ScrapbookCheckInLauncher/);
  assert.match(room, /TEEN_ROUTES\.scrapbookCheckIn/);
});

test('scrapbook scene reuses the current companion and existing Pages destination', () => {
  assert.match(route, /selectedSekret/);
  assert.match(route, /useLocalSearchParams/);
  assert.match(route, /requestedCompanion \?\? selectedSekret/);
  assert.match(route, /normalizeScrapbookCompanion/);
  assert.match(route, /pathname:\s*TEEN_ROUTES\.pages/);
  assert.match(route, /companionKey === 'ja' \? 'oracle' : companionKey/);
  assert.doesNotMatch(route, /companion-chat/);
});

test('Ja is the single visible alias of legacy Oracle, never a substitute actor', () => {
  assert.match(component, /raylene:\s*'Suhana'/);
  assert.match(component, /rylane:\s*'Sy'/);
  assert.match(component, /cloud:\s*'Cloud'/);
  assert.match(component, /night:\s*'Night'/);
  assert.doesNotMatch(component, /['"`]Raylene['"`]/);
  assert.doesNotMatch(component, /['"`]Rylane['"`]/);
  assert.match(component, /ja:\s*'Ja'/);
  assert.match(component, /case 'oracle':/);
  assert.match(component, /case 'ja':/);
  assert.match(component, /scrapbook-ja-presence/);
  assert.match(component, /IMAGES\.bgJournal/);
  assert.match(canon, /Ja is Oracle/);
  assert.match(canon, /isolated Ja portrait/);
  const teenPages = readFileSync('app/(teen)/pages/index.tsx', 'utf8');
  const legacyPages = readFileSync('screens/PagesScreen.tsx', 'utf8');
  assert.match(teenPages, /id: 'oracle',\s+name: 'Ja'/);
  assert.match(teenPages, /requested === 'ja' \? 'oracle' : requested/);
  // A reused Pages route must honor a NEW explicit companion deep link.
  assert.match(teenPages, /const incoming = COMPANIONS\.find\(c => c\.id === requestedTab\)\?\.id/);
  assert.match(teenPages, /useEffect\(\(\) => \{[\s\S]*?setActiveTab\(incoming\);[\s\S]*?\}, \[requestedTab\]\)/);
  assert.match(legacyPages, /id: 'oracle', label: 'Ja'/);
  const history = readFileSync('app/(teen)/pages/history.tsx', 'utf8');
  const entry = readFileSync('app/(teen)/pages/[id].tsx', 'utf8');
  const discover = readFileSync('app/(teen)/discover.tsx', 'utf8');
  assert.match(history, /oracle:\s*\{ label: 'Ja'/);
  assert.match(entry, /oracle:\s*\{ label: 'Ja'/);
  assert.match(discover, /'night', 'oracle'/);
  assert.match(discover, /id === 'oracle'/);
});

test('Pages keeps Sy a boy and Cloud a glowing cloud, not a human substitute', () => {
  const pages = readFileSync('app/(teen)/pages/index.tsx', 'utf8');
  const theme = readFileSync('constants/theme.base.ts', 'utf8');
  assert.match(pages, /'rylane', 'raylene', 'cloud', 'night', 'oracle', 'me'/);
  assert.match(pages, /id: 'rylane',\s+name: 'Sy'/);
  assert.match(pages, /cardCaption: 'Big Bro Vibes'/);
  assert.match(pages, /getTeenCompanionAsset\('rylane'/);
  assert.match(pages, /pages-sy-boy-portrait/);
  assert.match(theme, /rylaneProfile\s*=\s*rylaneFullbody/);
  assert.match(pages, /id: 'cloud',\s+name: 'Cloud'/);
  assert.match(pages, /neutral:\s*IMAGES\.cloudAvatarNeutral/); 
  assert.match(pages, /pages-cloud-aura/);
  assert.match(pages, /pages-cloud-sprite/);
  assert.match(theme, /cloudAvatarNeutral\s*=\s*cloud;/);
  assert.match(pages, /pages-ja-card-star/);
  assert.match(pages, /cardCaption: 'Guidance'/);
  assert.doesNotMatch(pages, /cardCaption:\s*'Big Sis Vibes'/);
});

test('approved scrapbook visual grammar and time-of-day behavior remain wired', () => {
  assert.match(component, /getRoomPhase\(new Date\(\)\)/);
  assert.match(component, /getRoomScene\(character, phase\)/);
  assert.match(component, /you made it through today\./);
  assert.match(component, /scrapbook-companion-scene/);
  assert.match(component, /scrapbook-bip-cta/);
  assert.match(component, /scrapbook-check-in-launcher/);
  assert.match(component, /character === 'cloud' && styles\.photoGlowCloud/);
  assert.match(component, /scrapbook-cloud-aura/);
  assert.match(component, /shadowColor: '#b7f4ff'/);

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

test('Product Design proof captures the actual Sy evening scrapbook route at 390x844', () => {
  assert.match(workflow, /e2e\/scrapbook-companion-check-in\.spec\.ts/);
  assert.match(e2e, /width:\s*390,\s*height:\s*844/);
  assert.match(e2e, /Date\.prototype,\s*'getHours'/);
  assert.match(e2e, /value:\s*\(\) => 18/);
  assert.match(e2e, /\/scrapbook-check-in\?bipDevSide=teen&companion=sy/);
  assert.match(e2e, /EVENING CHECK-IN/);
  assert.match(e2e, /you made it through today\./);
  assert.match(e2e, /sy-evening-390x844\.png/);
  assert.match(e2e, /cloud-glow-390x844/);
  assert.match(e2e, /scrapbook-cloud-aura/);
  assert.match(e2e, /toHaveAccessibleName\('Bip with Sy'\)/);
  assert.match(e2e, /toHaveURL\(\/\\\/pages/);
});
