// src/bipJr/study/types.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/types/study.ts (blob 15828f2f).
// ChildAgeBand now reuses the canonical BipJrAgeBand instead of a parallel type.

import type { BipJrAgeBand } from '@/services/bipJr';

export type ChildAgeBand = BipJrAgeBand;

export type StudySubject = 'reading' | 'math' | 'science' | 'language' | 'study_skills';
export type StudyMode = 'solo_ai' | 'adult_mission' | 'classroom_activity';
export type StudyLevel = 'warm_up' | 'practice';

export type StudyChoice = {
  id: string;
  label: string;
};

export type StudyMission = {
  id: string;
  sequence: number;
  level: StudyLevel;
  subject: StudySubject;
  ageBand: ChildAgeBand;
  title: string;
  goal: string;
  prompt: string;
  choices: ReadonlyArray<StudyChoice>;
  correctChoiceId: string;
  hint: string;
  explanation: string;
  offlineFinish: string;
};

export type StudyProgressSnapshot = {
  completedMissionIds: string[];
  attemptsByMission: Record<string, number>;
  lastSubject: StudySubject | null;
};

export type StudyModePolicy = {
  mode: StudyMode;
  enabledInPrototype: boolean;
  requiresAdultAssignment: boolean;
  allowsChildToChildCommunication: false;
  description: string;
};
