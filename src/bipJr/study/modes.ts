// src/bipJr/study/modes.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/config/studyBuddy.ts (blob 9f678993).

import type { StudyModePolicy, StudySubject } from './types';

export const STUDY_SUBJECTS: ReadonlyArray<{
  id: StudySubject;
  label: string;
  emoji: string;
}> = [
  { id: 'reading', label: 'Reading', emoji: '📖' },
  { id: 'math', label: 'Math', emoji: '➕' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'language', label: 'Language', emoji: '🌍' },
  { id: 'study_skills', label: 'Study skills', emoji: '🧠' },
];

export const STUDY_MODE_POLICIES: ReadonlyArray<StudyModePolicy> = [
  {
    mode: 'solo_ai',
    enabledInPrototype: true,
    requiresAdultAssignment: false,
    allowsChildToChildCommunication: false,
    description: 'Private scripted practice with a computer helper. No lesson text is sent to an AI service in this prototype.',
  },
  {
    mode: 'adult_mission',
    enabledInPrototype: false,
    requiresAdultAssignment: true,
    allowsChildToChildCommunication: false,
    description: 'Locked until verified adult authority and assignment records exist. A local role choice is not enough.',
  },
  {
    mode: 'classroom_activity',
    enabledInPrototype: false,
    requiresAdultAssignment: true,
    allowsChildToChildCommunication: false,
    description: 'Future school-controlled activity mode. No student chat, search, profiles, or private exchange.',
  },
];
