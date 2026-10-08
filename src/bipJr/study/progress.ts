// src/bipJr/study/progress.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/services/studyProgress.ts (blob 2726822c).
// Pure progress rules; device persistence lives in progressStore.ts.

import type { StudyProgressSnapshot, StudySubject } from './types';

export const STUDY_PROGRESS_KEY = 'jr_study_progress_v1';

export const EMPTY_STUDY_PROGRESS: StudyProgressSnapshot = {
  completedMissionIds: [],
  attemptsByMission: {},
  lastSubject: null,
};

const STUDY_SUBJECTS = new Set<StudySubject>(['reading', 'math', 'science', 'language', 'study_skills']);

function isStudySubject(value: unknown): value is StudySubject {
  return typeof value === 'string' && STUDY_SUBJECTS.has(value as StudySubject);
}

export function normalizeStudyProgress(value: unknown): StudyProgressSnapshot {
  if (!value || typeof value !== 'object') return { ...EMPTY_STUDY_PROGRESS };
  const candidate = value as Partial<StudyProgressSnapshot>;
  return {
    completedMissionIds: Array.isArray(candidate.completedMissionIds)
      ? candidate.completedMissionIds.filter((item): item is string => typeof item === 'string').slice(0, 100)
      : [],
    attemptsByMission: candidate.attemptsByMission && typeof candidate.attemptsByMission === 'object'
      ? Object.fromEntries(Object.entries(candidate.attemptsByMission).filter(([key, count]) => key.length < 80 && Number.isInteger(count) && Number(count) >= 0).slice(0, 100))
      : {},
    lastSubject: isStudySubject(candidate.lastSubject) ? candidate.lastSubject : null,
  };
}

export function applyStudyAttempt(
  progress: StudyProgressSnapshot,
  missionId: string,
  subject: StudySubject,
  correct: boolean,
): StudyProgressSnapshot {
  const attempts = Math.min((progress.attemptsByMission[missionId] ?? 0) + 1, 99);
  const completed = correct && !progress.completedMissionIds.includes(missionId)
    ? [...progress.completedMissionIds, missionId].slice(-100)
    : progress.completedMissionIds;
  return {
    completedMissionIds: completed,
    attemptsByMission: { ...progress.attemptsByMission, [missionId]: attempts },
    lastSubject: subject,
  };
}
