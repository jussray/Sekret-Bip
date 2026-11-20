import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/screens/CalmScreen.tsx', import.meta.url), 'utf8');
const route = fs.readFileSync(new URL('../app/(teen)/calm/index.tsx', import.meta.url), 'utf8');

test('canonical Calm route mounts the repaired screen', () => {
  assert.match(route, /import \{ CalmScreen \} from '@screens\/CalmScreen'/);
  assert.match(route, /<CalmScreen/);
});

test('Calm exposes no empty press handlers or decorative fake buttons', () => {
  assert.doesNotMatch(source, /onPress=\{\(\) => \{\}\}/);
  assert.doesNotMatch(source, /<TouchableOpacity style=\{s\.sekretHeart\}>/);
  assert.match(source, /<View style=\{s\.sekretHeart\}/);
});

test('mood selection has visible and accessible state', () => {
  assert.match(source, /testID="calm-mood-status"/);
  assert.match(source, /Selected mood:/);
  assert.match(source, /testID=\{`calm-mood-\$\{item\.id\}`\}/);
  assert.match(source, /accessibilityState=\{\{ selected \}\}/);
});

test('Calm plan editor offers real local presets and completion controls', () => {
  assert.match(source, /const PLAN_PRESETS: PlanPreset\[\]/);
  assert.match(source, /id: 'gentle'/);
  assert.match(source, /id: 'heavy-day'/);
  assert.match(source, /id: 'night'/);
  assert.match(source, /testID="calm-edit-plan"/);
  assert.match(source, /testID="calm-plan-editor"/);
  assert.match(source, /setPlanEditorOpen\(open => !open\)/);
  assert.match(source, /choosePreset\(preset\)/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /accessibilityState=\{\{ checked: item\.done \}\}/);
  assert.match(source, /your choice stays in this screen right now\./);
});

test('Calm uses canonical companion display names and truthful breathing picks', () => {
  assert.match(source, /return 'Sy';/);
  assert.match(source, /return 'Suhana';/);
  assert.match(source, /Breathing Picks for You/);
  assert.match(source, /each pick opens the breathing space/);
  assert.match(source, /onPress=\{onOpenBreathe\}/);
  assert.doesNotMatch(source, /healing frequency|late night rain|deep sleep waves/);
  assert.doesNotMatch(source, /🔒 private/);
  assert.match(source, /personal space/);
});
