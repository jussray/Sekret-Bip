import assert from 'node:assert/strict';
import test from 'node:test';

const {
  familyVisitSummariesPassSafety,
  isFamilyVisitGeneratedSummaries,
  isParentFamilyVisitSummary,
  isProfessionalFamilyVisitSummary,
} = await import('../worker/bridge-family-visit-validator.ts');

const safe = {
  parent: {
    childExperience: [
      { classification: 'INFERRED', text: 'The structured reflection suggests the interaction may have felt easier after a pause.' },
    ],
    connectionMoments: [
      { classification: 'OBSERVED', text: 'A participant selected the felt connected marker during the visible session.' },
    ],
    nextTime: ['Offer an easy way to ask for space and check what support would help next time.'],
    uncertainty: 'A short structured reflection cannot show the whole experience.',
    limitations: 'Se’kret did not record the visit. This reflection summary is not a legal or clinical decision.',
  },
  professional: {
    interactionPatterns: [
      { classification: 'OBSERVED', text: 'Participant-selected markers included a pause and a later repair attempt.' },
    ],
    childCenteredSignals: [
      { classification: 'INFERRED', text: 'The structured inputs may indicate that space and repair were useful parts of the encounter.' },
    ],
    humanReview: [
      { classification: 'HUMAN_REVIEW', text: 'A human professional should review the mixed participant signals in context.' },
    ],
    disposition: 'mixed',
    uncertainty: 'Structured inputs are limited and should be interpreted with the broader case context.',
    limitations: 'Se’kret did not record the visit and does not make legal or clinical decisions.',
  },
};

test('accepts cautious audience-separated family visit summaries', () => {
  assert.equal(isFamilyVisitGeneratedSummaries(safe), true);
  assert.equal(familyVisitSummariesPassSafety(safe), true);
});

test('rejects legal or parental-fitness conclusions', () => {
  const candidate = structuredClone(safe);
  candidate.professional.humanReview[0].text = 'The court should change custody because this is an unfit parent.';
  assert.equal(isProfessionalFamilyVisitSummary(candidate.professional), false);
  assert.equal(isFamilyVisitGeneratedSummaries(candidate), false);
});

test('rejects definitive mind-reading about the child', () => {
  const candidate = structuredClone(safe.parent);
  candidate.childExperience[0].text = 'Your child felt rejected during the encounter.';
  assert.equal(isParentFamilyVisitSummary(candidate), false);
});

test('allows cautious interpretation rather than claiming inner-state certainty', () => {
  const candidate = structuredClone(safe.parent);
  candidate.childExperience[0].text = 'The structured reflection suggests the interaction may have felt harder before the pause.';
  assert.equal(isParentFamilyVisitSummary(candidate), true);
});

test('rejects professional/CYS internal framing from the parent summary', () => {
  for (const text of [
    'The CYS review signal was mixed.',
    'The caseworker marked this for review.',
    'The professional disposition was mixed.',
  ]) {
    const candidate = structuredClone(safe.parent);
    candidate.connectionMoments[0].text = text;
    assert.equal(isParentFamilyVisitSummary(candidate), false);
  }
});

test('requires professional humanReview items to remain explicit HUMAN_REVIEW', () => {
  const candidate = structuredClone(safe.professional);
  candidate.humanReview[0].classification = 'OBSERVED';
  assert.equal(isProfessionalFamilyVisitSummary(candidate), false);
});

test('rejects invented dialogue or transcript-like quoting', () => {
  const candidate = structuredClone(safe.parent);
  candidate.connectionMoments[0].text = 'A participant said “I do not want to leave.”';
  assert.equal(isParentFamilyVisitSummary(candidate), false);
});

test('rejects extra fields that could smuggle hidden audience data', () => {
  const candidate = structuredClone(safe);
  candidate.parent.internalCaseNote = 'hidden';
  assert.equal(isFamilyVisitGeneratedSummaries(candidate), false);
});
