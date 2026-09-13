import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lintAvatarResponse } from '../src/services/ai/aiPatternLinter.ts';

const source = await readFile('src/services/ai/aiPatternLinter.ts', 'utf8');
const docs = await readFile('docs/AI_PATTERN_LINTER.md', 'utf8');
const panel = await readFile('src/features/control-room/PromptOsPanel.tsx', 'utf8');
const thirdPartyNotices = await readFile('THIRD_PARTY_NOTICES.md', 'utf8');

test('voice audit is density based and explicitly not an authorship detector', () => {
  assert.match(source, /Density-based persona voice QA/);
  assert.match(source, /authorshipInference: 'not-supported'/);
  assert.match(source, /repeatedPatternCluster \|\| crossPatternCluster/);
  assert.match(source, /hasProximateCrossPatternCluster/);
  assert.match(source, /repeatedPatternCluster\s*\?\s*false\s*:\s*hasProximateCrossPatternCluster/);
  assert.match(source, /severity: LintResult\['severity'\] = clustered \? 'warn' : 'clean'/);
  assert.doesNotMatch(source, /hits\.some\(\(hit\) => hit\.severity === 'hard'\) \? 'block'/);
  assert.doesNotMatch(source, /independentOccurrences\.slice\(index \+ 1\)/);
});

test('overlapping pattern families stay one isolated evidence site', () => {
  for (const draft of [
    'The pivotal moment arrived.',
    'It stands as a testament.',
    'The vibrant community gathered.',
  ]) {
    const result = lintAvatarResponse(draft, 'redteam');
    assert.equal(result.clustered, false, draft);
    assert.equal(result.severity, 'clean', draft);
  }
});

test('nearby independent pattern sites form a real cross-pattern cluster', () => {
  const result = lintAvatarResponse('Great question. The tapestry hung nearby.', 'redteam');
  assert.equal(result.clustered, true);
  assert.equal(result.severity, 'warn');
});

test('distant isolated markers do not masquerade as density in a long draft', () => {
  const filler = 'plain words '.repeat(250);
  const result = lintAvatarResponse(`Great question. ${filler}The tapestry hung nearby.`, 'redteam');

  assert.equal(result.clustered, false);
  assert.equal(result.severity, 'clean');
});

test('staccato runs count real short sentence units', () => {
  const result = lintAvatarResponse('Go now. Be safe. Call me. Stay there. Keep calm.', 'redteam');
  const staccato = result.hits.find((hit) => hit.patternId === 31);

  assert.ok(staccato);
  assert.equal(staccato.occurrences, 5);
  assert.equal(result.clustered, true);
  assert.equal(result.severity, 'warn');
});

test('a long sentence tail cannot impersonate a third staccato sentence', () => {
  const draft = 'This opening sentence deliberately contains many ordinary words before it eventually ends. Go now. Be safe.';
  const result = lintAvatarResponse(draft, 'redteam');
  const staccato = result.hits.find((hit) => hit.patternId === 31);

  assert.equal(staccato, undefined);
  assert.equal(result.clustered, false);
  assert.equal(result.severity, 'clean');
});

test('common abbreviations do not create fake sentence boundaries', () => {
  const result = lintAvatarResponse('Dr. Rivera wrote a detailed explanation for everyone in the room. Go now. Be safe.', 'redteam');
  const staccato = result.hits.find((hit) => hit.patternId === 31);

  assert.equal(staccato, undefined);
  assert.equal(result.clustered, false);
});

test('large repeated single-pattern input short-circuits cross-pattern scanning', () => {
  const result = lintAvatarResponse('tapestry '.repeat(3000), 'redteam');
  const loadedVocabulary = result.hits.find((hit) => hit.patternId === 7);

  assert.ok(loadedVocabulary);
  assert.equal(loadedVocabulary.occurrences, 3000);
  assert.equal(result.clustered, true);
  assert.equal(result.severity, 'warn');
});

test('voice prompts reject blacklist behavior while preserving valid punctuation and vocabulary', () => {
  assert.match(source, /Do not ban a word, punctuation mark, compound, list, or rhetorical structure because it appears once/);
  assert.match(source, /Preserve precise vocabulary and correct punctuation/);
  assert.match(source, /including em dashes when they genuinely fit/);
  assert.doesNotMatch(source, /No em dashes/);
  assert.doesNotMatch(source, /Never use: pivotal/);
});

test('voice prompts forbid fabricated humanity', () => {
  assert.match(source, /Do not invent personal experience, certainty, opinions, or emotional texture just to sound human/);
});

test('documentation preserves the same truth boundary', () => {
  assert.match(docs, /not an AI-authorship detector/i);
  assert.match(docs, /never blocks a response by itself/i);
  assert.match(docs, /Do not create vocabulary or punctuation blacklists/);
});

test('humanizer provenance remains discoverable in source, docs, and third-party notices', () => {
  for (const text of [source, docs, thirdPartyNotices]) {
    assert.match(text, /humanizer v2\.8\.2/i);
    assert.match(text, /blader\/humanizer/i);
    assert.match(text, /MIT License/i);
  }
  assert.match(source, /Copyright \(c\) 2025 Siqi Chen/i);
  assert.match(thirdPartyNotices, /Copyright \(c\) 2025 Siqi Chen/i);
});

test('founder Control Room labels the feature as voice integrity, not AI authenticity', () => {
  assert.match(panel, /Voice Integrity Audit/);
  assert.match(panel, /does not infer authorship and never blocks on one isolated style marker/);
  assert.match(panel, /Authorship inference: \{lintResult\.authorshipInference\}/);
  assert.doesNotMatch(panel, /AI Voice Authenticity/);
});
