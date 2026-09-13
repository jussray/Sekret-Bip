/**
 * Canonical companion ↔ internal-honor identity boundary.
 *
 * Suhana, Sy, Cloud, and Night are the only user-facing companion identities.
 * Joseema and Se'kret are internal honor identities. They may shape runtime
 * reasoning, but they must never become selectable companions, reply labels,
 * TTS identities, accessibility labels, notifications, or client metadata.
 *
 * `oracle` is a legacy compatibility key for the Joseema internal lens only.
 */

import {
  COMPANION_DISPLAY_NAMES,
  type NamedCompanionId,
} from '@/features/identity/companionIds';
import { migratePersistedCompanionId } from '@/features/identity/legacyCompanionIdMigration';

export type { NamedCompanionId } from '@/features/identity/companionIds';

export const INTERNAL_HONOR_IDENTITIES = Object.freeze(['joseema', 'sekret'] as const);
export type InternalHonorIdentity = (typeof INTERNAL_HONOR_IDENTITIES)[number];

export const LEGACY_INTERNAL_REASONING_NAME = 'Oracle' as const;

export type InternalAiIdentity =
  | NamedCompanionId
  | InternalHonorIdentity
  | 'oracle';

export type InternalIdentitySuppressedSurface =
  | 'companion-picker'
  | 'companion-avatar-grid'
  | 'companion-chat'
  | 'reply-header'
  | 'loading-state'
  | 'tts'
  | 'notification'
  | 'accessibility'
  | 'archive';

const INTERNAL_IDENTITY_SUPPRESSED_SURFACES = new Set<string>([
  'companion-picker',
  'companion-avatar-grid',
  'companion-chat',
  'reply-header',
  'loading-state',
  'tts',
  'notification',
  'accessibility',
  'archive',
  // Legacy surface names remain suppressed during migration.
  'sekret-chat',
  'sekret-archive',
]);

/**
 * Resolve an internal-only identity without making it displayable.
 * Legacy `oracle` belongs to the Joseema lens. Se'kret remains distinct.
 */
export function resolveInternalHonorIdentity(value: unknown): InternalHonorIdentity | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, '');
  if (raw === 'oracle' || raw === 'joseema') return 'joseema';
  if (raw === 'sekret' || raw === 'secret') return 'sekret';
  return null;
}

export function isInternalHonorIdentity(value: unknown): value is InternalHonorIdentity {
  return value === 'joseema' || value === 'sekret';
}

/**
 * Resolve a value for user-facing companion display.
 * Internal and unknown identities fail closed to `null`, never to another
 * companion and never to an internal name.
 */
export function resolveVisibleIdentity(identity: string): string | null {
  const canonical = migratePersistedCompanionId(identity);
  return canonical ? COMPANION_DISPLAY_NAMES[canonical] : null;
}

/**
 * Kept for migration callers that previously requested a direct Se'kret label.
 * Internal honor identities deliberately have no public companion label.
 */
export function getVisibleIdentity(): null {
  return null;
}

export function containsOracleLeak(value: string): boolean {
  return value.toLowerCase().includes(LEGACY_INTERNAL_REASONING_NAME.toLowerCase());
}

/** Throw when constructed user-facing copy exposes the legacy internal key. */
export function assertNoOracleLeak(displayValue: string): void {
  if (containsOracleLeak(displayValue)) {
    throw new Error(
      `[identityContract] User-facing value must not expose ${LEGACY_INTERNAL_REASONING_NAME}.`,
    );
  }
}

/** True for every surface where internal honor identities must stay hidden. */
export function shouldSuppressInternalIdentity(surfaceId: string): boolean {
  return INTERNAL_IDENTITY_SUPPRESSED_SURFACES.has(surfaceId);
}

/**
 * Compatibility aliases for older callers. Se'kret is no longer a public
 * companion identity on any surface.
 */
export function isSekretVisibleSurface(_surfaceId: string): boolean {
  return false;
}

export function shouldSuppressSekretIdentity(surfaceId: string): boolean {
  return shouldSuppressInternalIdentity(surfaceId);
}
