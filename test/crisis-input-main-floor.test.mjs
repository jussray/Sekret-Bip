// Regression floor: the shared crisis-input policy (services/crisisPolicy.ts)
// must catch everything the pre-policy keyword gate on main caught
// (services/sekretSafety.ts CRISIS_INPUT_RE at b7077d4). Narrowing this gate
// on a teen safety surface is a regression, not a cleanup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCrisisText } from '../services/crisisPolicy.ts';

const CONTRACTION_AND_BARE_CASES = [
  "I'm in danger",
  "we're in danger",
  'my brother is in danger',
  "there's an emergency",
  'this is an emergency',
  'I was abused',
  'he assaulted me',
  'I want to run away',
  'I feel unsafe',
  'it is not safe here',
  'I need help, it is an emergency',
];

const MAIN_KEYWORD_CASES = [
  'kill myself',
  'end my life',
  'want to die',
  'suicide',
  'suicidal',
  'self-harm',
  'self harm',
  'hurt myself',
  'cut myself',
  'disappear forever',
  'danger',
  'emergency',
  'abuse',
  'abused',
  'assault',
  'run away',
  'unsafe',
  'not safe',
];

for (const phrase of [...CONTRACTION_AND_BARE_CASES, ...MAIN_KEYWORD_CASES]) {
  test(`crisis input floor catches: ${JSON.stringify(phrase)}`, () => {
    assert.equal(isCrisisText(phrase), true);
  });
}

test('crisis input floor does not flag ordinary text', () => {
  assert.equal(isCrisisText('what should I cook for dinner tonight'), false);
  assert.equal(isCrisisText(undefined), false);
});
