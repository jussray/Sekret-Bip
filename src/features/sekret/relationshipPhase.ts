/**
 * Deterministic relationship-phase contract for future L4 memory.
 *
 * This module does not prove that durable memory, consent, reflection or
 * deletion infrastructure exists. It only defines the phase calculation that
 * those systems may call after their own authorization checks pass.
 */

export type RelationshipPhase =
  | 'new'
  | 'building'
  | 'established'
  | 'deep'
  | 'reflective';

export type PhaseInput = {
  durableMemoryCount: number;
  reflectionRunCount: number;
  unresolvedContradictions: number;
};

const ESTABLISHED_MEMORY_MINIMUM = 10;
const DEEP_MEMORY_MINIMUM = 30;

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function isReflectionEligible(input: PhaseInput): boolean {
  const durableMemoryCount = normalizeCount(input.durableMemoryCount);
  const reflectionRunCount = normalizeCount(input.reflectionRunCount);
  const unresolvedContradictions = normalizeCount(input.unresolvedContradictions);

  return (
    durableMemoryCount >= ESTABLISHED_MEMORY_MINIMUM &&
    reflectionRunCount > 0 &&
    unresolvedContradictions === 0
  );
}

export function deriveRelationshipPhase(input: PhaseInput): RelationshipPhase {
  const durableMemoryCount = normalizeCount(input.durableMemoryCount);

  if (isReflectionEligible(input)) return 'reflective';
  if (durableMemoryCount >= DEEP_MEMORY_MINIMUM) return 'deep';
  if (durableMemoryCount >= ESTABLISHED_MEMORY_MINIMUM) return 'established';
  if (durableMemoryCount >= 1) return 'building';
  return 'new';
}
