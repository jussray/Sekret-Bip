import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lintAvatarResponse } from '../src/services/ai/aiPatternLinter.ts';

const source = await readFile('src/services/ai/aiPatternLinter.ts', 'utf8');
const docs = await readFile('docs/AI_PATTERN_LINTER.md', 'utf8');
const panel = await readFile('src/features/control-room/PromptOsPanel.tsx', 'utf8');

test('voice audit is density based and explicitly not an authorship detector', () => {
  assert.match(source, /Density-based persona voice QA/);
  assert.match(source, /authorshipInference: 'not-supported'/);
  assert.match(source, /repeatedPatternCluster \|\| crossPatternCluster/);
  assert.match(source, /left\.patternId !== right\.patternId && !overlaps\(left, right\)/);
  assert.match(source, /severity: LintResult\['severity'\] = clustered \? 'warn' : 'clean'/);
  assert.doesNotMatch(source, /hits\.some\(\(hit\) => hit\.severity === 'hard'\) \? 'block'/);
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

test('separate pattern sites still form a real cross-pattern cluster', () => {
  const result = lintAvatarResponse('The pivotal moment arrived. The tapestry hung nearby.', 'redteam');
  assert.equal(result.clustered, true);
  assert.equal(result.severity, 'warn');
});

test('staccato runs count the short sentences they actually consume', () => {
  const result = lintAvatarResponse('Go now. Be safe. Call me. Stay there. Keep calm.', 'redteam');
  const staccato = result.hits.find((hit) => hit.patternId === 31);

  assert.ok(staccato);
  assert.equal(staccato.occurrences, 5);
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

test('founder Control Room labels the feature as voice integrity, not AI authenticity', () => {
  assert.match(panel, /Voice Integrity Audit/);
  assert.match(panel, /does not infer authorship and never blocks on one isolated style marker/);
  assert.match(panel, /Authorship inference: \{lintResult\.authorshipInference\}/);
  assert.doesNotMatch(panel, /AI Voice Authenticity/);
});
