import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(
  new URL('../src/components/room/hotspots/RoomHotspot.tsx', import.meta.url),
  'utf8',
);

test('room hotspots follow live viewport dimensions instead of module-scope screen constants', () => {
  assert.match(source, /useWindowDimensions/);
  assert.match(source, /viewportWidth \* x/);
  assert.match(source, /viewportHeight \* y/);
  assert.doesNotMatch(source, /Dimensions\.get\(['"]window['"]\)/);
});

test('room hotspot labels use Reanimated timing plus spring motion', () => {
  assert.match(source, /useSharedValue/);
  assert.match(source, /useAnimatedStyle/);
  assert.match(source, /withTiming/);
  assert.match(source, /withSpring/);
  assert.match(source, /labelScale\.value/);
  assert.match(source, /labelOffsetY\.value/);
});

test('room hotspot motion cleans timers and UI-thread animations on unmount', () => {
  assert.match(source, /clearHideTimer/);
  assert.match(source, /cancelAnimation\(labelOpacity\)/);
  assert.match(source, /cancelAnimation\(labelScale\)/);
  assert.match(source, /cancelAnimation\(labelOffsetY\)/);
});

test('room hotspots expose deterministic interaction witnesses for browser proof', () => {
  assert.match(source, /testID={`room-hotspot-\$\{id\}`}/);
  assert.match(source, /testID={`room-hotspot-\$\{id\}-button`}/);
  assert.match(source, /testID={`room-hotspot-\$\{id\}-label`}/);
});
