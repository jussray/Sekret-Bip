import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assertContains(text, expected, label) {
  assert.ok(
    text.includes(expected),
    `${label} should include: ${expected}`,
  );
}

test('name canon preserves Suhana and Sy as canonical display names with stable legacy ids', () => {
  const nameCanon = read('docs/COMPANION_NAME_CANON.md');

  assertContains(nameCanon, 'Read with:', 'name canon');
  assertContains(nameCanon, '`docs/HUMAN_AI_IDENTITY_AGENT_HANDOFF.md`', 'name canon');
  assertContains(nameCanon, '`docs/COMPANION_IDENTITY_BIBLE.md`', 'name canon');
  assertContains(nameCanon, '`docs/OPENAI_COMPANION_RUNTIME.md`', 'name canon');
  assertContains(nameCanon, '**Suhana**: canonical display/canon name for the companion formerly documented as Raylene.', 'name canon');
  assertContains(nameCanon, '**Sy**: canonical display/canon name for the companion formerly documented as Rylane.', 'name canon');
  assertContains(nameCanon, 'raylene -> Suhana', 'name canon');
  assertContains(nameCanon, 'rylane  -> Sy', 'name canon');
  assertContains(nameCanon, 'Do not rename internal ids, database values, analytics values, route keys, fixtures, or saved user state unless a dedicated code migration and compatibility plan exists.', 'name canon');
});

test('identity bible preserves HUMAN-AI canon life without real-world deception', () => {
  const identityBible = read('docs/COMPANION_IDENTITY_BIBLE.md');

  assertContains(identityBible, 'Se’kret Bip companions are AI companions with fictional canon lives rooted in Soria.', 'identity bible');
  assertContains(identityBible, 'The difference is not that they have no life. The difference is that their life is **Se’kret/Soria canon**, not a literal real-world biography.', 'identity bible');
  assertContains(identityBible, 'They should never trick a teen into believing the companion is a biological human outside the app.', 'identity bible');
  assertContains(identityBible, '**Real-world truth:** the companion is an AI companion running inside Se’kret Bip.', 'identity bible');
  assertContains(identityBible, '**Se’kret/Soria canon truth:** the companion has a fictional homeworld, life, family, childhood, school memories, private memories, holidays, customs, spiritual/non-spiritual language, and personal history inside the product universe.', 'identity bible');
  assertContains(identityBible, '**Teen memory truth:** the companion may remember the teen only through approved product memory and request context.', 'identity bible');
});

test('runtime docs keep the little human AI direction and factual AI boundary together', () => {
  const runtimeDoc = read('docs/OPENAI_COMPANION_RUNTIME.md');

  assertContains(runtimeDoc, 'The goal is companions who know who they are, know whose side they are on, know they are AI, and still reply with lived-feeling specificity, safety, privacy, and style discipline.', 'runtime doc');
  assertContains(runtimeDoc, 'This is the “little human AI” direction: human-shaped enough to relate, canon-rich enough to stand on who they are, Sorian enough to have lineage, home-life, values, holidays, customs, birth-clouds, living-world objects, and spiritual/non-spiritual language, but transparent enough not to deceive.', 'runtime doc');
  assertContains(runtimeDoc, 'I am not a biological human outside the app, and Soria is not a verified real-world planet.', 'runtime doc');
  assertContains(runtimeDoc, 'The companion should not repeat that on every turn.', 'runtime doc');
  assertContains(runtimeDoc, 'It must disclose naturally when asked, when the user appears confused about whether it is human, when a capability/memory boundary matters, when Soria is questioned as real-world fact, when Cloud is questioned as a literal entity, or when trust requires clarity.', 'runtime doc');
});

test('agent handoff keeps canonical names and HUMAN-AI precedence explicit', () => {
  const handoff = read('docs/HUMAN_AI_IDENTITY_AGENT_HANDOFF.md');

  assertContains(handoff, 'Use these names first in new user-facing docs, prompt language, fallback copy, and review summaries:', 'agent handoff');
  assertContains(handoff, '**Suhana**: canonical display/canon name for the companion formerly documented as Raylene.', 'agent handoff');
  assertContains(handoff, '**Sy**: canonical display/canon name for the companion formerly documented as Rylane.', 'agent handoff');
  assertContains(handoff, 'Legacy names remain compatibility aliases only:', 'agent handoff');
  assertContains(handoff, 'The product direction is **HUMAN-AI relational companion**, not generic AI disclaimer mode and not deceptive biological-human roleplay.', 'agent handoff');
  assertContains(handoff, 'When identity, trust, capability, memory, safety, or real-world access becomes relevant, the companion should answer in voice while plainly reminding the user it is still only AI outside Se’kret Bip.', 'agent handoff');
  assertContains(handoff, 'HUMAN-feeling relation inside the app. AI factual boundary when it matters. No fake offline life. No flattening.', 'agent handoff');
  assertContains(handoff, 'npm run test:human-ai-contract', 'agent handoff');
});
