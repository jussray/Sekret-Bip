import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const source = read('screens/UserRoomScreen.tsx');

test('room hotspot tour cycles through every hotspot in the current room, not just one hardcoded id', () => {
  // Historical defect (#958): the one-time discoverability hint was
  // hardcoded to a single hotspot id ('pages'), so every other hotspot in
  // every room never revealed what it does before first interaction.
  assert.doesNotMatch(source, /setHintSpot\('pages'\)/);
  assert.match(source, /for \(const spot of hotspots\)/);
  assert.match(source, /setHintSpot\(spot\.id\)/);
  assert.match(source, /setHintSpot\(null\)/);
});

test('the hotspot tour is a separate effect gated on reduced motion, not folded into the ambient animation loops', () => {
  assert.match(source, /const reduceMotion\s*=\s*useReducedMotion\(\);/);
  assert.match(source, /import \{ useReducedMotion \} from '\.\.\/hooks\/useReducedMotion';/);
  assert.match(source, /if \(reduceMotion \|\| hotspots\.length === 0\) return;/);
  // Must not be inside the mount effect that starts glowLoop/pulseLoop/breathLoop —
  // those ambient loops are pre-existing and out of this fix's scope.
  const tourEffectIndex = source.indexOf('for (const spot of hotspots)');
  const glowLoopIndex = source.indexOf('glowLoop.start()');
  assert.ok(tourEffectIndex > -1 && glowLoopIndex > -1);
  assert.ok(tourEffectIndex > glowLoopIndex, 'the hotspot tour must be its own effect, declared after the ambient-animation effect');
});

test('tour timers are cleaned up on unmount, matching the existing cleanup pattern for other room timers/loops', () => {
  const tourEffectStart = source.indexOf('useEffect(() => {\n    if (reduceMotion');
  const tourEffectEnd = source.indexOf('\n  }, [reduceMotion, hotspots]);');
  assert.ok(tourEffectStart > -1 && tourEffectEnd > tourEffectStart);
  const tourEffectBody = source.slice(tourEffectStart, tourEffectEnd);
  assert.match(tourEffectBody, /return \(\) => timers\.forEach\(clearTimeout\);/);
});

test('existing hint rendering path (isHinted / hintAnim / tapHint) is reused, not duplicated', () => {
  assert.match(source, /const isHinted = hintSpot === spot\.id;/);
  assert.match(source, /\{isHinted && \(/);
  assert.match(source, /<Text style={s\.tapHint}>\{spot\.hint \?\? 'Tap'\}<\/Text>/);
  // Only one isHinted-gated tap-hint render path should exist.
  const occurrences = source.split('s.tapHint}>{spot.hint').length - 1;
  assert.equal(occurrences, 1);
});

test('Night room hotspots (current production priority) all carry a hint label the tour can show', () => {
  const nightBlockStart = source.indexOf('const NIGHT_HOTSPOTS: Hotspot[] = [');
  const nightBlockEnd = source.indexOf('];', nightBlockStart);
  const nightBlock = source.slice(nightBlockStart, nightBlockEnd);
  const ids = ['window', 'pages', 'voiceBip', 'comfort', 'bridge'];
  for (const id of ids) {
    assert.match(nightBlock, new RegExp(`id: '${id}'[\\s\\S]{0,200}?hint: '`), `Night hotspot '${id}' must have a hint label for the tour to show`);
  }
});
