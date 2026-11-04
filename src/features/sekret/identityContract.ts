/**
 * Canonical Oracle ↔ Se'kret identity boundary.
 *
 * Oracle is internal reasoning and must never be rendered to a teen or parent.
 * Se'kret is the visible continuity presence. Named companions keep their own
 * visible identities.
 */

import {
  COMPANION_DISPLAY_NAMES,
  type NamedCompanionId,
} from '@/features/identity/companionIds';
import { migratePersistedCompanionId } from '@/features/identity/legacyCompanionIdMigration';

export type { NamedCompanionId } from '@/features/identity/companionIds';

export const VISIBLE_AI_NAME = "Se'kret" as const;
export const INTERNAL_REASONING_NAME = 'Oracle' as const;

export type InternalAiIdentity = NamedCompanionId | 'sekret' | 'oracle';

export type SekretVisibleSurface =
  | 'sekret-chat'
  | 'sekret-archive'
  | 'reply-header'
  | 'loading-state'
  | 'tts'
  | 'notification'
  | 'accessibility';

export type SekretSuppressedSurface =
  | 'companion-picker'
  | 'companion-avatar-grid';

const SEKRET_VISIBLE_SURFACES = new Set<string>([
  'sekret-chat',
  'sekret-archive',
  'reply-header',
  'loading-state',
  'tts',
  'notification',
  'accessibility',
]);

const SEKRET_SUPPRESSED_SURFACES = new Set<string>([
  'companion-picker',
  'companion-avatar-grid',
]);

/** Resolve an internal Oracle or Se'kret identity to the user-facing name. */
export function getVisibleIdentity(): typeof VISIBLE_AI_NAME {
  return VISIBLE_AI_NAME;
}

/**
 * Resolve an identity for display without collapsing named companions into
 * Se'kret. Persisted pre-cutover IDs are migrated only at this read boundary.
 * Unknown values fail closed to Se'kret rather than a named companion.
 */
export function resolveVisibleIdentity(identity: string): string {
  const canonical = migratePersistedCompanionId(identity);

  if (canonical) {
    return COMPANION_DISPLAY_NAMES[canonical];
  }

  return VISIBLE_AI_NAME;
}

export function containsOracleLeak(value: string): boolean {
  return value.toLowerCase().includes(INTERNAL_REASONING_NAME.toLowerCase());
}

/** Throw when a constructed user-facing label exposes the internal name. */
export function assertNoOracleLeak(displayValue: string): void {
  if (containsOracleLeak(displayValue)) {
    throw new Error(
      `[identityContract] User-facing value must not expose ${INTERNAL_REASONING_NAME}. ` +
        `Use ${VISIBLE_AI_NAME} instead.`,
    );
  }
}

/** True only for surfaces where Se'kret's visible identity is expected. */
export function isSekretVisibleSurface(surfaceId: string): boolean {
  return SEKRET_VISIBLE_SURFACES.has(surfaceId);
}

/** True only for companion-selection surfaces where Se'kret must be hidden. */
export function shouldSuppressSekretIdentity(surfaceId: string): boolean {
  return SEKRET_SUPPRESSED_SURFACES.has(surfaceId);
}
