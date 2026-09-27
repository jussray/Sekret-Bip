/**
 * src/utils/storage.ts
 *
 * Canonical location (moved from utils/storage.ts in Step 3).
 * AsyncStorage persistence layer for all app state.
 *
 * Import via: import { loadState, saveState } from '@/utils';
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  theme: 'theme', mood: 'mood', userSide: 'userSide',
  selectedSekret: 'selectedSekret', sekretMode: 'sekretMode',
  growthPath: 'growthPath', journalText: 'journalText',
  parentPagesDraft: 'parentPagesDraft', lastOpenDate: 'lastOpenDate',
  parentMood: 'parentMood', parentMoodDate: 'parentMoodDate',
  parentRoomStyle: 'parentRoomStyle', streakDays: 'streakDays',
  periodDays: 'periodDays', lastPeriodStart: 'lastPeriodStart',
  entries: 'entries', moodHistory: 'moodHistory',
  circlePosts: 'circlePosts', parentCirclePosts: 'parentCirclePosts',
  voiceNotes: 'voiceNotes', parentVoiceNotes: 'parentVoiceNotes',
  parentPagesEntries: 'parentPagesEntries',
  oracleJournalEntries: 'oracleJournalEntries',
  oracleProfile: 'oracleProfile', parentOracleProfile: 'parentOracleProfile',
  oracleSessions: 'oracleSessions', parentOracleSessions: 'parentOracleSessions',
  comfortSessions: 'comfortSessions',
  crewMembers: 'crewMembers', crewCheckIns: 'crewCheckIns',
  parentCrewMembers: 'parentCrewMembers', parentCrewCheckIns: 'parentCrewCheckIns',
  roomMemory: 'roomMemory',
  parentProfileData: 'parent_profile_data',
  parentProfileDone: 'parent_profile_done',
  linkedTeenId: 'linked_teen_id',
  devTestFamilyV1: 'dev_test_family_v1',
  meaningfulReturnReceipts: 'sekretbip_meaningful_return_receipts_v1',
  meaningfulReturnSeen: 'sekretbip_meaningful_return_seen_v1',
  bipEnergyAdjustment: 'sekretbip_bip_energy_adjustment_v1',
  bipEnergyAdjustmentSeen: 'sekretbip_bip_energy_adjustment_seen_v1',
  bridgeResponsePreference: 'sekretbip_bridge_response_preference_v1',
  savedContinuation: 'sekretbip_saved_continuation_v1',
};

const JSON_KEYS = new Set([
  'entries', 'moodHistory', 'circlePosts', 'parentCirclePosts',
  'voiceNotes', 'parentVoiceNotes', 'parentPagesEntries',
  'oracleJournalEntries', 'oracleProfile', 'parentOracleProfile',
  'oracleSessions', 'parentOracleSessions',
  'comfortSessions', 'crewMembers', 'crewCheckIns',
  'parentCrewMembers', 'parentCrewCheckIns',
  'roomMemory', 'periodDays',
  'parent_profile_data', 'dev_test_family_v1',
  'sekretbip_meaningful_return_receipts_v1',
  'sekretbip_bip_energy_adjustment_v1',
  'sekretbip_saved_continuation_v1',
]);

const PRIVATE_ACCOUNT_KEYS = [
  STORAGE_KEYS.mood,
  STORAGE_KEYS.userSide,
  STORAGE_KEYS.selectedSekret,
  STORAGE_KEYS.sekretMode,
  STORAGE_KEYS.growthPath,
  STORAGE_KEYS.journalText,
  STORAGE_KEYS.parentPagesDraft,
  STORAGE_KEYS.lastOpenDate,
  STORAGE_KEYS.parentMood,
  STORAGE_KEYS.parentMoodDate,
  STORAGE_KEYS.parentRoomStyle,
  STORAGE_KEYS.streakDays,
  STORAGE_KEYS.periodDays,
  STORAGE_KEYS.lastPeriodStart,
  STORAGE_KEYS.entries,
  STORAGE_KEYS.moodHistory,
  STORAGE_KEYS.circlePosts,
  STORAGE_KEYS.parentCirclePosts,
  STORAGE_KEYS.voiceNotes,
  STORAGE_KEYS.parentVoiceNotes,
  STORAGE_KEYS.parentPagesEntries,
  STORAGE_KEYS.oracleJournalEntries,
  STORAGE_KEYS.oracleProfile,
  STORAGE_KEYS.parentOracleProfile,
  STORAGE_KEYS.oracleSessions,
  STORAGE_KEYS.parentOracleSessions,
  STORAGE_KEYS.comfortSessions,
  STORAGE_KEYS.crewMembers,
  STORAGE_KEYS.crewCheckIns,
  STORAGE_KEYS.parentCrewMembers,
  STORAGE_KEYS.parentCrewCheckIns,
  STORAGE_KEYS.roomMemory,
  STORAGE_KEYS.parentProfileData,
  STORAGE_KEYS.parentProfileDone,
  STORAGE_KEYS.linkedTeenId,
  STORAGE_KEYS.devTestFamilyV1,
  STORAGE_KEYS.meaningfulReturnReceipts,
  STORAGE_KEYS.meaningfulReturnSeen,
  STORAGE_KEYS.bipEnergyAdjustment,
  STORAGE_KEYS.bipEnergyAdjustmentSeen,
  STORAGE_KEYS.bridgeResponsePreference,
  STORAGE_KEYS.savedContinuation,
  'sekretbip_first_visit_done',
  'parent_bridge_pending',
  'sekret_self_discovery_profile',
  'bip_onboarding_reflection',
  'teen_profile_data',
  // Transient onboarding choices are account-sensitive. A shared device must not
  // replay a prior user's pre-auth age/side state into the next account.
  'bip_onboarding_side',
  'bip_onboarding_age',
  'bip_age_verification_status',
  'bip_age_verification_method',
  'bip_age_guardian_required',
  'bip_age_raw_evidence_stored',
] as const;

export const loadState = async (): Promise<Record<string, any>> => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    const vals = await AsyncStorage.multiGet(keys);
    const state: Record<string, any> = {};
    vals.forEach(([k, v]) => {
      if (v) {
        try {
          state[k] = JSON_KEYS.has(k) ? JSON.parse(v) : v;
        } catch {
          state[k] = v;
        }
      }
    });
    return state;
  } catch (error) {
    console.error('loadState error:', error);
    return {};
  }
};

export const saveState = async (stateUpdates: Record<string, any>): Promise<void> => {
  try {
    const pairs: [string, string][] = Object.entries(stateUpdates).map(([k, v]) => [
      k,
      typeof v === 'string' ? v : JSON.stringify(v),
    ]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.error('saveState error:', error);
  }
};

export async function clearPrivateAccountCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...PRIVATE_ACCOUNT_KEYS]);
  } catch (error) {
    console.error('clearPrivateAccountCache error:', error);
  }
}
