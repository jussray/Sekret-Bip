// src/bipJr/study/progressStore.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/services/studyProgress.ts (blob 2726822c).
// Device-only storage: mastery IDs, attempt counts, and last subject. Nothing is synced.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_STUDY_PROGRESS, STUDY_PROGRESS_KEY, normalizeStudyProgress } from './progress';
import type { StudyProgressSnapshot } from './types';

export async function loadStudyProgress(): Promise<StudyProgressSnapshot> {
  const raw = await AsyncStorage.getItem(STUDY_PROGRESS_KEY);
  if (!raw) return { ...EMPTY_STUDY_PROGRESS };
  try {
    return normalizeStudyProgress(JSON.parse(raw));
  } catch {
    // Unreadable device data restarts practice; the stored text is never logged.
    console.warn('Bip Jr study progress was unreadable on this device; starting fresh.');
    return { ...EMPTY_STUDY_PROGRESS };
  }
}

export async function saveStudyProgress(progress: StudyProgressSnapshot): Promise<void> {
  await AsyncStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(normalizeStudyProgress(progress)));
}
