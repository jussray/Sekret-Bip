import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const component = readFileSync(
  'components/intentions/DailyIntentionsCard.tsx',
  'utf8',
);

const roomScreen = readFileSync(
  'screens/UserRoomScreen.tsx',
  'utf8',
);

const roomRenderer = readFileSync(
  'components/rooms/BareRoomRenderer.tsx',
  'utf8',
);

const roomArtGuide = readFileSync(
  'docs/ROOM_ART_GUIDE.md',
  'utf8',
);

const roomAssetMap = readFileSync(
  'ROOM_ASSET_MAP.md',
  'utf8',
);

const themeEntry = readFileSync(
  'constants/theme.ts',
  'utf8',
);

const workflow = readFileSync(
  '.github/workflows/product-design-playwright-proof.yml',
  'utf8',
);

test('Teen Room arrives with daily intentions collapsed and visually subordinate', () => {
  assert.ok(
    component.includes('const [expanded, setExpanded] = useState(false);'),
    'Daily intentions must not cover the living Room on first arrival',
  );
  assert.ok(
    component.includes("accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} today's intentions`}"),
    'Collapsed intentions must remain explicitly discoverable and expandable',
  );
  assert.ok(
    component.includes('const IS_NARROW_RAIL = SCREEN_WIDTH < 360;'),
    'Utility rail geometry must adapt when three controls cannot safely share one row',
  );
  assert.ok(
    component.includes('const COLLAPSED_CARD_WIDTH = IS_NARROW_RAIL ? Math.min(CARD_WIDTH, 118) : 108;'),
    'Collapsed intentions must stay compact enough to fit between Mood and return controls',
  );
  assert.ok(
    component.includes('const COLLAPSED_CARD_LEFT = IS_NARROW_RAIL ? 14 : Math.max(102, Math.round(SCREEN_WIDTH * 0.27));'),
    'Collapsed intentions must occupy the center utility-rail slot on standard phone widths',
  );
  assert.ok(
    component.includes('const COLLAPSED_CARD_BOTTOM = IS_NARROW_RAIL ? 126 : 26;'),
    'Narrow phones must lift intentions above the utility rail instead of forcing overlap',
  );
  assert.ok(
    component.includes('const EXPANDED_CARD_BOTTOM = 104;'),
    'Expanded intentions must clear Mood, return receipt, and tab navigation',
  );
  assert.ok(
    component.includes('expanded ? s.cardExpanded : s.cardCollapsed'),
    'Expanded and collapsed intentions must retain distinct presentations',
  );
  assert.ok(
    component.includes('left: expanded ? 14 : COLLAPSED_CARD_LEFT'),
    'Collapsed intentions must use the center rail slot while expanded content returns to the left reading edge',
  );
  assert.ok(
    component.includes('bottom: expanded ? EXPANDED_CARD_BOTTOM : COLLAPSED_CARD_BOTTOM'),
    'Intentions must switch between utility-rail and expanded clearance geometry explicitly',
  );
  assert.ok(
    component.includes('{ left: COLLAPSED_CARD_LEFT, bottom: COLLAPSED_CARD_BOTTOM }'),
    'The intentions-off affordance must share the same collision-safe placement contract',
  );
  assert.ok(
    component.includes('<Text style={s.collapsedLabel}>✦ today</Text>'),
    'Collapsed intentions should render as a small peek, not the full panel title',
  );
});

test('Room owns one canonical companion visual with a separate bounded tap target', () => {
  assert.ok(
    roomScreen.includes('const COMPANION_VISUAL_POSITIONS'),
    'Room must own explicit visual companion geometry',
  );
  assert.ok(
    roomScreen.includes('const COMPANION_HIT_TARGETS'),
    'Room must own separate bounded companion interaction geometry',
  );
  assert.ok(
    roomScreen.includes('testID="room-companion-visual"'),
    'The canonical companion visual must expose a deterministic witness',
  );
  assert.ok(
    roomScreen.includes('testID="room-companion-hit-target"'),
    'The bounded tap target must expose a deterministic witness',
  );
  assert.ok(
    roomScreen.includes('pointerEvents="none"\n        testID="room-companion-visual"'),
    'The enlarged visual must not itself capture taps',
  );
  assert.ok(
    roomScreen.includes('const cSrc        = safe(AVATARS[cId]?.fullbody, cRuntime.source ?? cPoseSrc);'),
    'Room staging must prefer the public fullbody alias while retaining canonical runtime fallback authority',
  );
  assert.doesNotMatch(roomScreen, /const COMPANION_POSITIONS/);
});

test('Teen Room loads canonical room-only archive PNGs instead of drifted reference composites', () => {
  for (const key of ['raylene', 'rylane', 'cloud', 'night']) {
    assert.ok(
      roomRenderer.includes(`../../assets/images/archive/bg-${key}-room-day.png`),
      `${key} must load its canonical archive room background`,
    );
  }
  assert.doesNotMatch(
    roomRenderer,
    /IMAGES\.bg(?:Raylene|Rylane|Cloud|Night)Room/,
    'User Room must not inherit the resized theme background mapping',
  );
  assert.doesNotMatch(
    roomRenderer,
    /-scene\.jpg/,
    'Scene/reference composites must never become User Room runtime backgrounds',
  );
  assert.ok(
    roomAssetMap.includes('Do not render in production UI.'),
    'The asset inventory must keep scene composites below production authority',
  );
  assert.ok(
    roomArtGuide.includes('Production room backgrounds stay room-only. Do not bake a second companion into the background.'),
    'The art guide must preserve the single-companion composition boundary',
  );
  assert.ok(
    roomArtGuide.includes('The Teen User Room may render exactly one canonical companion visual above the room background'),
    'The art guide must agree with the runtime companion-layer contract',
  );
});

test('Public theme boundary uses the separated Suhana production avatar and preserves canonical display names', () => {
  assert.ok(
    roomAssetMap.includes('assets/images/raylene-neutral-new.png'),
    'The asset inventory must retain Suhana neutral as a production character asset',
  );
  assert.ok(
    roomAssetMap.includes('These are already separate from room backgrounds.'),
    'The asset inventory must retain the avatar-layer separation contract',
  );
  assert.ok(
    themeEntry.includes("const suhanaRoomSprite = require('../assets/images/raylene-neutral-new.png');"),
    'Suhana Room sprite must use the documented separated production avatar layer',
  );
  assert.ok(
    themeEntry.includes("const syRoomSprite = require('../assets/images/companions/teen/rylane/neutral.png');"),
    'Sy Room sprite must remain unchanged without a Sy-specific failing receipt',
  );
  assert.ok(
    themeEntry.includes("const nightRoomSprite = require('../assets/images/companions/teen/night/neutral.png');"),
    'Night Room sprite must remain unchanged without a Night-specific failing receipt',
  );
  assert.ok(themeEntry.includes('rayleneFullbody: suhanaRoomSprite'));
  assert.ok(themeEntry.includes('rylaneFullbody: syRoomSprite'));
  assert.ok(themeEntry.includes('nightFullbody: nightRoomSprite'));
  assert.doesNotMatch(themeEntry, /companions\/teen\/raylene\/neutral\.png/);
  assert.doesNotMatch(themeEntry, /raylene-master\.png/);
  assert.ok(themeEntry.includes('name: "Suhana\'s Room"'));
  assert.ok(themeEntry.includes("name: 'Sy After Dark'"));
  assert.ok(themeEntry.includes("name: 'Suhana'"));
  assert.ok(themeEntry.includes("name: 'Sy'"));
});

test('Product Design proof watches the composition surfaces', () => {
  assert.ok(
    workflow.includes("- 'components/**'"),
    'Shared component changes must trigger Product Design proof on pull requests',
  );
  assert.ok(
    workflow.includes("- 'screens/**'"),
    'Room screen changes must trigger Product Design proof on pull requests',
  );
  assert.ok(
    workflow.includes('test/room-intentions-hierarchy-contract.test.mjs'),
    'The Room hierarchy contract must execute in Product Design proof',
  );
  assert.ok(
    workflow.includes('e2e/room-canonical-display.spec.ts'),
    'The browser geometry witness must run inside Product Design proof',
  );
});
