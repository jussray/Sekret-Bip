import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gate = fs.readFileSync('docs/L3_MEMORY_ACTIVATION_GATE.md', 'utf8');
const productDesign = fs.readFileSync('e2e/product-design-review.spec.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260918234500_agent_memories_l3_contract.sql', 'utf8');
const candidatePointer = fs.readFileSync('supabase/candidates/20260918234500_agent_memories_l3_contract.sql', 'utf8');

test('L3 activation requires exact production and database proof rather than flag flips', () => {
  for (const required of [
    'fresh Supabase preview database',
    'User A cannot select or delete User B memory',
    'Direct authenticated insert/update/delete remain denied',
    'custom-auth Edge Functions retain live negative-auth proof',
    'leaked-password protection is enabled',
    'Exact-production `app.sekretbip.net` authority is restored',
    'trusted server retrieval path recomputes and verifies the integrity fingerprint',
    'Restricted memory is excluded from companion context by default',
  ]) assert.match(gate, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});

test('controlled founder visual evidence remains explicitly non-production', () => {
  assert.match(productDesign, /evidenceClass: 'controlled-founder-visual-proof'/);
  assert.match(productDesign, /productionClaim: false/);
  assert.match(gate, /Do not flip evidence or safety booleans from false to true by configuration alone/);
});

test('memory instruction authority is structurally false and never treated as a launch toggle', () => {
  const service = fs.readFileSync('src/services/ai/agentMemory.ts', 'utf8');
  assert.match(service, /instructionAuthority: false as const/);
  assert.match(gate, /memory instruction authority are evidence\/trust state, not launch toggles/);
});

test('canonical migration remains immutable and the candidate pointer has no duplicate schema authority', () => {
  assert.match(migration, /create table if not exists public\.agent_memories/);
  assert.doesNotMatch(migration, /L3_MEMORY_ENABLED|MEMORY_ROLLOUT|enabled\s*=\s*true/i);
  assert.match(candidatePointer, /Non-authoritative pointer only/);
  assert.match(candidatePointer, /No schema changes/);
  assert.doesNotMatch(candidatePointer, /create table\s+if not exists\s+public\.agent_memories/i);
});
