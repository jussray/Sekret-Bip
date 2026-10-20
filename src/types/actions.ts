/**
 * AppActionsReturn
 * Typed return shape for the useAppActions hook.
 * Replaces `actions: any` in RouteRenderer props.
 */
import type { RoomMemory } from './roomMemory';
import type { JournalEntry } from '@/types';
import type { SavePageInput } from '../../screens/PagesScreen';
import type { OracleProfile, OracleSessionSummary } from '../../services/oracleDiscovery';

export type ActivityType = 'calm' | 'comfort' | 'voice' | 'journal' | 'growth' | 'mood';

export interface AppActionsReturn {
  /** Update room memory with a partial patch (also increments visitCount) */
  updateRoomMemory: (patch: Partial<RoomMemory>) => void;
  /** Track a user activity — writes a ComfortSession and calls Supabase sync */
  trackActivity: (type: ActivityType) => void;
  /** Select a mood, add to history, sync to Supabase */
  selectMood: (mood: string) => void;
  /** Save a teen journal entry, optionally from a character tab */
  saveJournalEntry: (override?: SavePageInput) => void;
  /** Patch an existing journal entry (e.g. attach a Se'kret reply) */
  patchJournalEntry: (id: number | string, patch: Partial<JournalEntry>) => void;
  /** Save a parent-side journal/reflection entry */
  saveParentPageEntry: (input: SavePageInput) => void;
  /** Save a teen circle post */
  saveCirclePost: (extra?: any) => void;
  /** React to a teen circle post */
  reactToPost: (id: string | number, type: string) => void;
  /** Save a parent circle post */
  saveParentCirclePost: () => void;
  /** React to a parent circle post */
  reactToParentPost: (id: string | number, type: string) => void;
  /** Complete a teen Oracle discovery session */
  completeTeenOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;
  /** Complete a parent Oracle discovery session */
  completeParentOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;
}
