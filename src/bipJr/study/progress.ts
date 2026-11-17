// src/bipJr/study/progress.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/services/studyProgress.ts (blob 2726822c).
// Pure progress rules; device persistence lives in progressStore.ts.

import type { ChildAgeBand, StudyProgressSnapshot, StudySubject } from './types';

export const STUDY_PROGRESS_KEY = 'jr_study_progress_v1';
export const DEVICE_STUDY_SCOPE = 'device';

const STUDY_SCOPE_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export function isValidStudyScope(scope: unknown): scope is string {
  return typeof scope === 'string' && STUDY_SCOPE_PATTERN.test(scope);
}

// One key per child profile, so children sharing a device never share mastery.
export function studyProgressKey(scope: string): string {
  return `${STUDY_PROGRESS_KEY}:${isValidStudyScope(scope) ? scope : DEVICE_STUDY_SCOPE}`;
}

const CHILD_AGE_BANDS = new Set<ChildAgeBand>(['5-7', '8-10', '11-12']);

export function isChildAgeBand(value: unknown): value is ChildAgeBand {
  return typeof value === 'string' && CHILD_AGE_BANDS.has(value as ChildAgeBand);
}

export type ActiveStudyChild = { id: string; ageBand: ChildAgeBand };

export function normalizeActiveStudyChild(value: unknown): ActiveStudyChild | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ActiveStudyChild>;
  return isValidStudyScope(candidate.id) && isChildAgeBand(candidate.ageBand)
    ? { id: candidate.id, ageBand: candidate.ageBand }
    : null;
}

export function isStudyProgressKey(key: string): boolean {
  return key === STUDY_PROGRESS_KEY || key.startsWith(`${STUDY_PROGRESS_KEY}:`);
}

export const EMPTY_STUDY_PROGRESS: StudyProgressSnapshot = {
  completedMissionIds: [],
  attemptsByMission: {},
  lastSubject: null,
  lastAgeBand: null,
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
    lastAgeBand: isChildAgeBand(candidate.lastAgeBand) ? candidate.lastAgeBand : null,
  };
}

export function applyStudyAttempt(
  progress: StudyProgressSnapshot,
  missionId: string,
  subject: StudySubject,
  correct: boolean,
  ageBand?: ChildAgeBand,
): StudyProgressSnapshot {
  const attempts = Math.min((progress.attemptsByMission[missionId] ?? 0) + 1, 99);
  const completed = correct && !progress.completedMissionIds.includes(missionId)
    ? [...progress.completedMissionIds, missionId].slice(-100)
    : progress.completedMissionIds;
  return {
    completedMissionIds: completed,
    attemptsByMission: { ...progress.attemptsByMission, [missionId]: attempts },
    lastSubject: subject,
    lastAgeBand: ageBand ?? progress.lastAgeBand,
  };
}
