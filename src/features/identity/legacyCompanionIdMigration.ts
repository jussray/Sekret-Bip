import { isNamedCompanionId, type NamedCompanionId } from './companionIds';

export type LegacyPersistedCompanionId = 'raylene' | 'rylane' | 'cloud' | 'night';

const LEGACY_TO_CANONICAL: Readonly<Record<string, NamedCompanionId>> = {
  raylene: 'suhana',
  rylane: 'sy',
};

const CANONICAL_TO_LEGACY: Readonly<Record<NamedCompanionId, LegacyPersistedCompanionId>> = {
  suhana: 'raylene',
  sy: 'rylane',
  cloud: 'cloud',
  night: 'night',
};

/**
 * Read-boundary migration for companion IDs created before the canonical
 * Suhana/Sy cutover. Canonical app state must not grow new legacy IDs.
 */
export function migratePersistedCompanionId(value: unknown): NamedCompanionId | null {
  if (isNamedCompanionId(value)) return value;
  if (typeof value !== 'string') return null;

  return LEGACY_TO_CANONICAL[value.trim().toLowerCase()] ?? null;
}

/**
 * Transitional write-boundary adapter for the current account-profile/Supabase
 * contract. Remove this mapping when durable profile persistence accepts the
 * canonical Suhana/Sy IDs directly.
 */
export function toLegacyPersistedCompanionId(
  value: NamedCompanionId,
): LegacyPersistedCompanionId {
  return CANONICAL_TO_LEGACY[value];
}
