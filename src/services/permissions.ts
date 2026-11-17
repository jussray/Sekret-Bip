import type { AccountIdentity, CircleIdentity } from '@/types/identity';
import type { DoorbellEvent } from '@/types/doorbell';
import type { VerificationState } from '@/types/verification';
import { isLimitedMode, isTeenVerified } from './verificationState';

export interface LimitedModeAccess {
  privateRoom: boolean;
  journal: boolean;
  voiceBip: boolean;
  calmTools: boolean;
  comfortTools: boolean;
  memories: boolean;
  companionChat: boolean;
  circleRead: boolean;
  circlePost: boolean;
  crewInvites: boolean;
  peopleSearch: boolean;
  discovery: boolean;
  privateMessaging: boolean;
}

export function getLimitedModeAccess(state: VerificationState): LimitedModeAccess {
  const verified = isTeenVerified(state);
  const blocked = state === 'MANUAL_REVIEW' || state === 'SUSPENDED';

  return {
    privateRoom: !blocked,
    journal: !blocked,
    voiceBip: !blocked,
    calmTools: true,
    comfortTools: true,
    memories: !blocked,
    companionChat: !blocked,
    circleRead: verified,
    circlePost: verified,
    crewInvites: verified,
    peopleSearch: verified,
    discovery: verified,
    privateMessaging: false,
  };
}

export function canAccessCircle(identity: AccountIdentity): boolean {
  return getLimitedModeAccess(identity.verificationState).circleRead;
}

export function canPostToCircle(identity: AccountIdentity): boolean {
  return getLimitedModeAccess(identity.verificationState).circlePost;
}

export function canAccessCrew(identity: AccountIdentity): boolean {
  return getLimitedModeAccess(identity.verificationState).crewInvites;
}

export function canSearchPeople(identity: AccountIdentity): boolean {
  return getLimitedModeAccess(identity.verificationState).peopleSearch;
}

export function canUsePrivateMessaging(_identity: AccountIdentity): boolean {
  return false;
}

export function shouldShowLimitedMode(identity: AccountIdentity): boolean {
  return isLimitedMode(identity.verificationState);
}

export function resolveCircleDisplayName(
  circleIdentity: CircleIdentity | null | undefined,
  safeFallback = 'Moon Note',
): string {
  const value = circleIdentity?.displayName.trim();
  return value || safeFallback;
}

export function canParentViewEvent(event: DoorbellEvent): boolean {
  return Boolean(event.summary.trim()) && !containsPrivateContentKey(event as unknown as Record<string, unknown>);
}

const PRIVATE_KEYS = new Set([
  'journal',
  'journalText',
  'voiceTranscript',
  'voiceBipTranscript',
  'aiChat',
  'aiChatContent',
  'privateMemory',
  'privateNote',
  'rawContent',
  'messageBody',
]);

function containsPrivateContentKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => (
    PRIVATE_KEYS.has(key) || containsPrivateContentKey(nested)
  ));
}

export function redactParentPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (PRIVATE_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      result[key] = value.map(item => (
        item && typeof item === 'object'
          ? redactParentPayload(item as Record<string, unknown>)
          : item
      ));
      continue;
    }
    if (value && typeof value === 'object') {
      result[key] = redactParentPayload(value as Record<string, unknown>);
      continue;
    }
    result[key] = value;
  }

  return result as Partial<T>;
}
