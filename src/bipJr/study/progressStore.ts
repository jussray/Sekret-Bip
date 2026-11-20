// src/bipJr/study/progressStore.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/services/studyProgress.ts (blob 2726822c).
// Device-only storage: mastery IDs, attempt counts, and last subject. Nothing is synced.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_STUDY_PROGRESS,
  isStudyProgressKey,
  normalizeActiveStudyChild,
  normalizeStudyProgress,
  studyProgressKey,
  type ActiveStudyChild,
} from './progress';
import type { StudyProgressSnapshot } from './types';

export async function loadStudyProgress(scope: string): Promise<StudyProgressSnapshot> {
  const raw = await AsyncStorage.getItem(studyProgressKey(scope));
  if (!raw) return { ...EMPTY_STUDY_PROGRESS };
  try {
    return normalizeStudyProgress(JSON.parse(raw));
  } catch {
    // Unreadable device data restarts practice; the stored text is never logged.
    console.warn('Bip Jr study progress was unreadable on this device; starting fresh.');
    return { ...EMPTY_STUDY_PROGRESS };
  }
}

export async function saveStudyProgress(scope: string, progress: StudyProgressSnapshot): Promise<void> {
  await AsyncStorage.setItem(studyProgressKey(scope), JSON.stringify(normalizeStudyProgress(progress)));
}

// The child being practiced with is handed to the screen on the device, never in
// the URL, so profile IDs and age bands do not reach the web host's request logs.
const ACTIVE_STUDY_CHILD_KEY = 'jr_study_active_child_v1';

export async function setActiveStudyChild(child: ActiveStudyChild | null): Promise<void> {
  if (child) await AsyncStorage.setItem(ACTIVE_STUDY_CHILD_KEY, JSON.stringify(child));
  else await AsyncStorage.removeItem(ACTIVE_STUDY_CHILD_KEY);
}

export async function loadActiveStudyChild(): Promise<ActiveStudyChild | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_STUDY_CHILD_KEY);
  if (!raw) return null;
  try {
    return normalizeActiveStudyChild(JSON.parse(raw));
  } catch {
    console.warn('Bip Jr active study child was unreadable on this device; using device practice.');
    return null;
  }
}

// Called on sign-out so the next account on this device starts clean.
export async function clearAllStudyProgress(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const studyKeys = keys.filter(key => isStudyProgressKey(key) || key === ACTIVE_STUDY_CHILD_KEY);
  if (studyKeys.length > 0) await AsyncStorage.multiRemove(studyKeys);
}
