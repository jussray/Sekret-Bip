/**
 * useAppStore
 * -----------
 * Central in-memory state for the Bip app.
 * All useState fields previously living in AppContent (app/index.tsx)
 * are declared here as a typed shape so they can be imported by
 * the thin AppContent and by any future Zustand migration.
 *
 * Usage:
 *   const [state, setState] = useAppStore();
 *   setState(prev => ({ ...prev, mood: 'Happy' }));
 */
import { useState } from 'react';
import { type RoomMemory, DEFAULT_ROOM_MEMORY } from '../types/roomMemory';
import {
  createOracleProfile,
  type OracleProfile,
  type OracleSessionSummary,
} from '../services/oracleDiscovery';
import type {
  JournalEntry,
  CirclePost,
  ParentCirclePost,
  VoiceNote,
  MoodEntry,
  ComfortSession,
  CrewMember,
  CrewCheckIn,
} from '../types/index';
import type { OracleJournalEntry } from '../types/voiceIntelligence';
import type { ParentRoomStyle } from '@screens/ParentRoomScreen';

export interface AppState {
  // Navigation
  screen: string;

  // Theme & identity
  theme: string;
  selectedSekret: string;
  sekretMode: string;
  userSide: 'teen' | 'parent';
  parentRoomStyle: ParentRoomStyle;
  parentMood: string;
  parentMoodDate: string;

  // Mood
  mood: string;
  moodHistory: MoodEntry[];

  // Journal
  journalText: string;
  journalEntries: JournalEntry[];
  parentPagesDraft: string;
  parentPagesEntries: JournalEntry[];
  oracleJournalEntries: OracleJournalEntry[];
  oracleProfile: OracleProfile;
  parentOracleProfile: OracleProfile;
  oracleSessions: OracleSessionSummary[];
  parentOracleSessions: OracleSessionSummary[];

  // Circle
  circlePosts: CirclePost[];
  circlePostText: string;
  parentCirclePosts: ParentCirclePost[];
  parentCirclePostText: string;

  // Voice
  voiceNotes: VoiceNote[];
  parentVoiceNotes: VoiceNote[];

  // Comfort
  comfortSessions: ComfortSession[];

  // Crew
  crewMembers: CrewMember[];
  crewCheckIns: CrewCheckIn[];

  // Period calendar — ISO date strings e.g. '2026-06-17'
  periodDays: string[];

  // Streaks
  streakDays: number;
  lastOpenDate: string;
  streakJustReset: boolean;

  // Room
  roomMemory: RoomMemory;

  // UI
  homeMessageIndex: number;
  isLoading: boolean;
}

export function makeInitialState(): AppState {
  return {
    screen: 'splash',
    theme: 'raylene',
    selectedSekret: 'soft',
    sekretMode: 'soft',
    userSide: 'teen',
    parentRoomStyle: 'mom',
    parentMood: '',
    parentMoodDate: '',
    mood: 'Happy',
    moodHistory: [],
    journalText: '',
    journalEntries: [],
    parentPagesDraft: '',
    parentPagesEntries: [],
    oracleJournalEntries: [],
    oracleProfile: createOracleProfile('teen'),
    parentOracleProfile: createOracleProfile('parent'),
    oracleSessions: [],
    parentOracleSessions: [],
    circlePosts: [],
    circlePostText: '',
    parentCirclePosts: [],
    parentCirclePostText: '',
    voiceNotes: [],
    parentVoiceNotes: [],
    comfortSessions: [],
    crewMembers: [],
    crewCheckIns: [],
    periodDays: [],
    streakDays: 0,
    lastOpenDate: '',
    streakJustReset: false,
    roomMemory: DEFAULT_ROOM_MEMORY,
    homeMessageIndex: 0,
    isLoading: true,
  };
}

/**
 * Drop-in hook that exposes a mutable AppState.
 * Replace with Zustand / Jotai when ready.
 */
export function useAppStore() {
  return useState<AppState>(makeInitialState);
}
