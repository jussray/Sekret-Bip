/**
 * Canonical companion ↔ internal-honor identity boundary.
 *
 * Suhana, Sy, Cloud, and Night are the only user-facing companion identities.
 * Joseema and Se'kret are internal honor identities. They may shape runtime
 * reasoning, but they must never become selectable companions, reply labels,
 * TTS identities, accessibility labels, notifications, or client metadata.
 *
 * `oracle` is a hidden legacy compatibility bridge. Historically it resolves
 * through Se'kret continuity and may also carry the Joseema honor lens. It is
 * never a public companion identity and never replaces either honor identity.
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

export const LEGACY_ORACLE_CONTINUITY = Object.freeze({
  key: 'oracle' as const,
  visible: false as const,
  runtimeActor: 'sekret' as const,
  historicalPrimary: 'sekret' as const,
  honorLenses: Object.freeze(['sekret', 'joseema'] as const),
});

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
  'sekret-chat',
  'sekret-archive',
]);

function normalizeInternalIdentityKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, '');
}

export function resolveInternalHonorIdentities(value: unknown): readonly InternalHonorIdentity[] {
  const raw = normalizeInternalIdentityKey(value);
  if (!raw) return Object.freeze([] as InternalHonorIdentity[]);
  if (raw === 'oracle') return LEGACY_ORACLE_CONTINUITY.honorLenses;
  if (raw === 'joseema') return Object.freeze(['joseema'] as const);
  if (raw === 'sekret' || raw === 'secret') return Object.freeze(['sekret'] as const);
  return Object.freeze([] as InternalHonorIdentity[]);
}

export function resolveInternalHonorIdentity(value: unknown): InternalHonorIdentity | null {
  return resolveInternalHonorIdentities(value)[0] ?? null;
}

export function isLegacyOracleIdentity(value: unknown): boolean {
  return normalizeInternalIdentityKey(value) === 'oracle';
}

export function isInternalHonorIdentity(value: unknown): value is InternalHonorIdentity {
  return value === 'joseema' || value === 'sekret';
}

export function resolveVisibleIdentity(identity: string): string | null {
  const canonical = migratePersistedCompanionId(identity);
  return canonical ? COMPANION_DISPLAY_NAMES[canonical] : null;
}

export function getVisibleIdentity(): null {
  return null;
}

export function containsOracleLeak(value: string): boolean {
  return value.toLowerCase().includes(LEGACY_INTERNAL_REASONING_NAME.toLowerCase());
}

export function assertNoOracleLeak(displayValue: string): void {
  if (containsOracleLeak(displayValue)) {
    throw new Error(
      `[identityContract] User-facing value must not expose ${LEGACY_INTERNAL_REASONING_NAME}.`,
    );
  }
}

export function shouldSuppressInternalIdentity(surfaceId: string): boolean {
  return INTERNAL_IDENTITY_SUPPRESSED_SURFACES.has(surfaceId);
}

export function isSekretVisibleSurface(_surfaceId: string): boolean {
  return false;
}

export function shouldSuppressSekretIdentity(surfaceId: string): boolean {
  return shouldSuppressInternalIdentity(surfaceId);
}
