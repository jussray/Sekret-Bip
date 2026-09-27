import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('parent mood check-in can be dragged and remembers its position', async () => {
  const source = await read('screens/ParentRoomScreen.tsx');

  assert.match(source, /PanResponder\.create/);
  assert.match(source, /parent_mood_panel_position_v1/);
  assert.match(source, /moodPanelPosition\.getTranslateTransform\(\)/);
  assert.match(source, /drag to move/);
  assert.match(source, /AsyncStorage\.setItem\(/);
  assert.match(source, /AsyncStorage\.getItem\(/);
  assert.match(source, /clampMoodPanelPoint/);
});
