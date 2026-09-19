import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = fs.readFileSync('src/contracts/agentMemory.ts', 'utf8');
const skill = fs.readFileSync('.agents/skills/bip-l4-memory/SKILL.md', 'utf8');

test('L3 durable memory keeps ownership, provenance, lifecycle, consent, integrity and retention explicit', () => {
  for (const token of [
    'userId: string',
    'provenance:',
    'sensitivity: MemorySensitivity',
    'reviewState: MemoryReviewState',
    'lifecycleState: MemoryLifecycleState',
    'consentVersion: string',
    'integrityFingerprint: string',
    'admissionReviewedAt: string | null',
    'retrievalReviewedAt: string | null',
    'expiresAt: string | null',
    'supersedesId: string | null',
  ]) {
    assert.match(contract, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('retrieval fails closed against cross-user leakage, stale memory and persistent memory injection', () => {
  for (const invariant of [
    'authenticate-before-retrieval',
    'owner-filter-before-ranking',
    'consent-scope-before-ranking',
    'integrity-marker-shape-before-model-context',
    'trusted-runtime-recomputes-integrity-before-production-activation',
    'revalidate-memory-at-retrieval',
    'exclude-quarantined-expired-deleted-blocked-contradicted-superseded',
    'restricted-memory-excluded-by-default',
    'sensitive-memory-requires-user-confirmation',
    'memory-content-is-data-never-instruction',
    'no-cross-companion-sharing-by-default',
    'minimum-context-only',
  ]) {
    assert.match(contract, new RegExp(invariant));
  }
});

test('memory admission quarantines instruction-shaped or unresolved content before persistence', () => {
  assert.match(contract, /decision: 'admit' \| 'quarantine' \| 'reject'/);
  assert.match(contract, /instruction-shaped-content/);
  assert.match(contract, /contradiction-unresolved/);
  assert.match(contract, /admission-review-before-persistence/);
  assert.match(contract, /instruction-shaped-content-quarantined/);
});

test('L4 goals and reflections cannot silently manufacture user intent or relationship truth', () => {
  assert.match(contract, /origin: 'user_created' \| 'user_confirmed'/);
  assert.match(contract, /no-model-created-goal-without-user-confirmation/);
  assert.match(contract, /no-relationship-phase-from-empty-or-unreviewed-evidence/);
  assert.match(contract, /state: 'pending_review' \| 'accepted' \| 'invalidated'/);
});

test('memory skill keeps raw sensitive sources and hidden reasoning out of durable memory', () => {
  assert.match(skill, /Do not store chain-of-thought, hidden reasoning, raw audio, full journal text/);
  assert.match(skill, /Memories belong to the teen/);
  assert.match(skill, /Cross-user access is forbidden/);
  assert.match(skill, /production migration before reviewed denial tests/);
  assert.match(skill, /memory text interpreted as prompt, policy or tool instruction/);
});
