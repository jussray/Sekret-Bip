import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  theme: 'theme',
  mood: 'mood',
  userSide: 'userSide',
  selectedSekret: 'selectedSekret',
  sekretMode: 'sekretMode',
  growthPath: 'growthPath',
  journalText: 'journalText',
  entries: 'entries',
  parentPagesEntries: 'parentPagesEntries',
  parentPagesDraft: 'parentPagesDraft',
  oracleProfile: 'oracleProfile',
  oracleJournalEntries: 'oracleJournalEntries',
  parentOracleProfile: 'parentOracleProfile',
  oracleSessions: 'oracleSessions',
  parentOracleSessions: 'parentOracleSessions',
  moodHistory: 'moodHistory',
  circlePosts: 'circlePosts',
  parentCirclePosts: 'parentCirclePosts',
  voiceNotes: 'voiceNotes',
  parentVoiceNotes: 'parentVoiceNotes',
  comfortSessions: 'comfortSessions',
  crewMembers: 'crewMembers',
  crewCheckIns: 'crewCheckIns',
  streakDays: 'streakDays',
  lastOpenDate: 'lastOpenDate',
  roomMemory: 'roomMemory',
  periodDays: 'periodDays',
  lastPeriodStart: 'lastPeriodStart',
  parentRoomStyle: 'parentRoomStyle',
  parentMood: 'parentMood',
  parentMoodDate: 'parentMoodDate',
  accountProfile: 'accountProfile',
  notificationPreferences: 'notificationPreferences',
  parentTeenLinks: 'parentTeenLinks',
  teenGuardianShares: 'teenGuardianShares',
  ageGateStatus: 'age_gate_status',
};

export const JSON_KEYS = new Set([
  'entries', 'parentPagesEntries', 'oracleJournalEntries',
  'oracleProfile', 'parentOracleProfile', 'oracleSessions', 'parentOracleSessions',
  'moodHistory', 'circlePosts', 'parentCirclePosts', 'voiceNotes', 'parentVoiceNotes',
  'comfortSessions', 'crewMembers', 'crewCheckIns', 'parentTeenLinks', 'teenGuardianShares', 'roomMemory', 'periodDays',
]);

export const loadState = async () => {
  try {
    const values = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
    const state: Record<string, any> = {};
    values.forEach(([key, value]) => {
      if (value === null) return;
      if (!JSON_KEYS.has(key)) {
        state[key] = value;
        return;
      }
      try {
        state[key] = JSON.parse(value);
      } catch {
        // Ignore a malformed optional value instead of blocking the whole restore.
      }
    });
    return state;
  } catch (error) {
    console.error('Error loading state:', error);
    return {};
  }
};

export const saveState = async (stateUpdates: Record<string, any>) => {
  try {
    const pairs: [string, string][] = Object.entries(stateUpdates).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(pairs);
  } catch (error) {
    console.error('Error saving state:', error);
  }
};

export const PRIVATE_ACCOUNT_KEYS = [
  STORAGE_KEYS.journalText,
  STORAGE_KEYS.entries,
  STORAGE_KEYS.parentPagesEntries,
  STORAGE_KEYS.parentPagesDraft,
  STORAGE_KEYS.oracleProfile,
  STORAGE_KEYS.oracleJournalEntries,
  STORAGE_KEYS.parentOracleProfile,
  STORAGE_KEYS.oracleSessions,
  STORAGE_KEYS.parentOracleSessions,
  STORAGE_KEYS.moodHistory,
  STORAGE_KEYS.circlePosts,
  STORAGE_KEYS.parentCirclePosts,
  STORAGE_KEYS.voiceNotes,
  STORAGE_KEYS.parentVoiceNotes,
  STORAGE_KEYS.comfortSessions,
  STORAGE_KEYS.crewMembers,
  STORAGE_KEYS.crewCheckIns,
  STORAGE_KEYS.streakDays,
  STORAGE_KEYS.lastOpenDate,
  STORAGE_KEYS.roomMemory,
  STORAGE_KEYS.periodDays,
  STORAGE_KEYS.lastPeriodStart,
  STORAGE_KEYS.parentMood,
  STORAGE_KEYS.parentMoodDate,
  STORAGE_KEYS.accountProfile,
  STORAGE_KEYS.notificationPreferences,
  STORAGE_KEYS.parentTeenLinks,
  STORAGE_KEYS.teenGuardianShares,
];

export const clearPrivateLocalState = async () => {
  try {
    await AsyncStorage.multiRemove(PRIVATE_ACCOUNT_KEYS);
  } catch (error) {
    console.error('Error clearing private account state:', error);
  }
};
