import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
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
};

const JSON_KEYS = new Set([
  'entries', 'parentPagesEntries', 'oracleProfile', 'parentOracleProfile', 'oracleSessions', 'parentOracleSessions',
  'moodHistory', 'circlePosts', 'parentCirclePosts', 'voiceNotes', 'parentVoiceNotes', 'comfortSessions',
  'crewMembers', 'crewCheckIns', 'roomMemory', 'periodDays',
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
