import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/candidates/20260918234500_agent_memories_l3_contract.sql', 'utf8');
const service = fs.readFileSync('src/services/ai/agentMemory.ts', 'utf8');

test('L3 schema defaults to quarantine and cannot be directly written by authenticated clients', () => {
  assert.match(migration, /lifecycle_state\s+text not null default 'quarantined'/);
  assert.match(migration, /revoke all on table public\.agent_memories from public, anon, authenticated/);
  assert.match(migration, /grant select on table public\.agent_memories to authenticated/);
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete).*authenticated/i);
});

test('L3 owner select is permanent-account scoped and parent access is not granted', () => {
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /public\.is_non_anonymous_user\(\)/);
  assert.doesNotMatch(migration, /parent_links|guardian.*select|parent_user_id/i);
});

test('L3 memory stores minimal reviewed summaries with provenance, consent, retention and integrity', () => {
  for (const token of [
    'summary',
    'provenance_kind',
    'provenance_source_id',
    'provenance_source_created_at',
    'sensitivity',
    'review_state',
    'consent_version',
    'integrity_fingerprint',
    'admission_reviewed_at',
    'retention_mode',
    'expires_at',
    'retention_reason',
    'supersedes_id',
  ]) {
    assert.match(migration, new RegExp(`\\b${token}\\b`));
  }
  assert.doesNotMatch(migration, /raw_transcript|chain_of_thought|raw_audio|journal_text/i);
});

test('Phase 1 does not pre-install semantic vector storage before retrieval is authorized', () => {
  assert.match(migration, /Phase 1 intentionally omits embeddings\/vector indexes/);
  assert.doesNotMatch(migration, /create extension if not exists vector/i);
  assert.doesNotMatch(migration, /\bembedding\s+vector\s*\(/i);
});

test('active memory requires admission review and an eligible review state', () => {
  assert.match(migration, /lifecycle_state <> 'active'/);
  assert.match(migration, /admission_reviewed_at is not null/);
  assert.match(migration, /review_state in \('user_stated', 'user_confirmed'\)/);
});

test('owner forget path is permanent-account scoped and cannot delete another user memory', () => {
  assert.match(migration, /function public\.delete_own_agent_memory/);
  assert.match(migration, /if not public\.is_non_anonymous_user\(\)/);
  assert.match(migration, /where id = p_memory_id\s+and user_id = v_user/);
  assert.match(migration, /revoke all on function public\.delete_own_agent_memory\(uuid\) from anon/);
});

test('retrieval revalidates owner, consent, lifecycle, expiry, integrity marker shape and instruction-shaped content', () => {
  for (const token of [
    'memory.userId !== input.userId',
    'memory.consentVersion !== input.consentVersion',
    "memory.lifecycleState !== 'active'",
    'memory.admissionReviewedAt',
    'integrityFingerprint',
    'isExpired(memory, nowMs)',
    'looksInstructionShaped(memory.summary)',
  ]) {
    assert.match(service, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(service, /Phase 1 validates only that a non-secret fingerprint marker is present/);
  assert.match(service, /Production activation must add trusted-runtime recomputation/);
});

test('restricted memory is excluded and sensitive recall requires explicit confirmation', () => {
  assert.match(service, /memory\.sensitivity === 'restricted'/);
  assert.match(service, /memory\.sensitivity === 'sensitive' && memory\.reviewState !== 'user_confirmed'/);
});

test('retrieval output remains explicitly non-authoritative untrusted data', () => {
  assert.match(service, /kind: 'untrusted_memory_data'/);
  assert.match(service, /trust: 'untrusted-user-owned-memory-data'/);
  assert.match(service, /instructionAuthority: false/);
  assert.match(service, /never concatenate\s*\n \* it into system\/developer instructions/);
});
