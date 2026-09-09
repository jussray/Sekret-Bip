import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const vibe = readFileSync(new URL('../tools/figma-vibe-builder/README.md', import.meta.url), 'utf8');
const arrival = readFileSync(new URL('../src/components/FrontDoorSceneArrival.tsx', import.meta.url), 'utf8');
const motion = readFileSync(new URL('../src/motion/frontDoorMotion.ts', import.meta.url), 'utf8');

describe('Se’kret Bip Visual Wonder contract', () => {
  it('requires nonliteral, family-first wonder instead of generic AI/dashboard visual language', () => {
    assert.match(vibe, /family-first emotional worldbuilding/i);
    assert.match(vibe, /explanatory UI as support, not the visual idea itself/i);
    assert.match(vibe, /Never turn Se’kret Bip into generic “AI neon,” dashboard UI/i);
    assert.match(vibe, /If the answer to the last question is “any AI product,” the visual is not done/i);
  });

  it('defines Attack 2000 as concept + rendered-artifact falsification rather than fake test-count theater', () => {
    assert.match(vibe, /Attack 2000.*two falsification passes/i);
    assert.match(vibe, /not a claim that 2,000 external tests ran/i);
    assert.match(vibe, /Pass 1 — concept attack/i);
    assert.match(vibe, /Pass 2 — rendered artifact attack/i);
  });

  it('keeps the current arrival visual-first, temporary, accessible, and reduced-motion aware', () => {
    assert.ok(arrival.includes('testID="web-welcome-caveman-visual"'));
    assert.ok(arrival.includes('You. Your space. Enter.'));
    assert.ok(arrival.includes("prefers-reduced-motion: reduce"));
    assert.match(arrival, /arrivalState === 'entering'/);
    assert.match(arrival, /arrivalState !== 'entering'/);
    assert.match(motion, /arrivalDurationMs/);
  });

  it('keeps product truth and human dignity inside the beauty gate', () => {
    assert.match(vibe, /Product truth must stay legible inside the beauty/i);
    assert.match(vibe, /dignity, choice, privacy, and emotional safety/i);
    assert.match(vibe, /truthful but visually dead experience is incomplete/i);
  });
});
