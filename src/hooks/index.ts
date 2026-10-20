/**
 * src/hooks/index.ts
 *
 * Canonical hooks barrel.
 * Import via: import { useSekretState } from '@/hooks';
 */
export { useSekretState }  from './useSekretState';
export { useSafetyCheck } from './useSafetyCheck';
export { useLinkedTeen }  from './useLinkedTeen';
export type { LinkedTeenData, TeenActivitySummary, SharedJournalEntry, SharedMoodEntry, BridgeSignal } from './useLinkedTeen';
export { useStreak }      from './useStreak';
