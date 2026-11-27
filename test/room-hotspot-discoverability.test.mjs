/**
 * #958: RoomHotspot was a fully invisible touch zone (activeOpacity 0.01,
 * no visible affordance) whose label only appeared after it was already
 * pressed — a first-time user had no way to discover it. This proves the
 * bounded, reversible discoverability cue the issue asked for, without
 * touching room art, navigation, or existing press behavior.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const source = read('src/components/room/hotspots/RoomHotspot.tsx');

test('existing invisible touch target and press behavior are unchanged', () => {
  assert.match(source, /activeOpacity=\{0\.01\}/);
  assert.match(source, /accessibilityLabel=\{label\}/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /onPress=\{handlePress\}/);
});

test('the discover cue only shows before first interaction, for hotspots that are actually interactive', () => {
  assert.match(
    source,
    /const showDiscoverCue = Boolean\(onPress\) && !hasInteracted && discoveryWindowOpen;/,
  );
  assert.match(source, /setHasInteracted\(true\);/);
  // Set inside handlePress, before onPress fires, so the cue can never
  // reappear once a press is handled.
  const handlePressBody = source.slice(source.indexOf('const handlePress = ()'), source.indexOf('};', source.indexOf('const handlePress = ()')));
  assert.match(handlePressBody, /setHasInteracted\(true\);\s*\n\s*onPress\?\.\(\);/);
});

test('the cue is bounded — it closes itself after 8s even if never pressed, so it is never persistent clutter', () => {
  assert.match(
    source,
    /setTimeout\(\(\) => setDiscoveryWindowOpen\(false\), 8000\)/,
  );
});

test('reduced motion gets a static cue, not a looping animation', () => {
  const effectStart = source.indexOf('useEffect(() => {\n    if (!showDiscoverCue)');
  const effectEnd = source.indexOf('}, [showDiscoverCue, reduceMotion, discoverPulse]);');
  const effectBody = source.slice(effectStart, effectEnd);

  assert.match(effectBody, /if \(reduceMotion\) \{/);
  assert.doesNotMatch(
    effectBody.slice(effectBody.indexOf('if (reduceMotion)'), effectBody.indexOf('withRepeat')),
    /withRepeat/,
  );
  assert.match(effectBody, /withRepeat\(/);
});

test('the glow is a non-interactive overlay that cannot steal touches from the real target', () => {
  const renderStart = source.indexOf('return (');
  const renderBody = source.slice(renderStart, source.indexOf('{showLabel &&', renderStart));
  assert.match(renderBody, /\{showDiscoverCue && \(/);
  assert.match(renderBody, /pointerEvents="none"/);
});
