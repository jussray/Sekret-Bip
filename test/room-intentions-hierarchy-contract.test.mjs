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

const themeEntry = readFileSync(
  'constants/theme.ts',
  'utf8',
);

const themeBase = readFileSync(
  'constants/theme.base.ts',
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
    'Room staging must prefer the full-body pose while retaining canonical runtime fallback authority',
  );
  assert.doesNotMatch(roomScreen, /const COMPANION_POSITIONS/);
});

test('Room reuses the existing base full-body asset rather than overriding it in the public theme entry', () => {
  assert.match(
    themeBase,
    /const\s+rayleneFullbody\s*=\s*require\(["']\.\.\/assets\/images\/raylene-confident-new\.png["']\)/,
  );
  assert.doesNotMatch(themeEntry, /raylene-fullbody\.png/);
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