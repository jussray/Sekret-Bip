/**
 * AppStateReturn
 * Typed return shape for the useAppState hook.
 * Replaces the implicit `any` spread in RouteRenderer.
 *
 * All fields mirror the useState declarations in src/hooks/useAppState.ts.
 */
import React from 'react';
import type { RoomMemory } from './roomMemory';
import type {
  JournalEntry,
  CirclePost,
  ParentCirclePost,
  VoiceNote,
  MoodEntry,
  ComfortSession,
  CrewMember,
  CrewCheckIn,
} from '@/types';
import type { OracleProfile, OracleSessionSummary } from '../../services/oracleDiscovery';
import type { ParentRoomStyle } from '../../screens/ParentRoomScreen';
import type { OracleJournalEntry } from '../../types/voiceIntelligence';

export interface AppStateReturn {
  // ── Navigation ────────────────────────────────────────────────
  screen: string;
  setScreen: (s: string) => void;

  // ── Theme & identity ─────────────────────────────────────────
  theme: string;
  setTheme: (t: string) => void;
  selectedSekret: string;
  setSelectedSekret: (s: string) => void;
  sekretMode: string;
  setSekretMode: (m: string) => void;
  userSide: 'teen' | 'parent';
  setUserSide: (s: 'teen' | 'parent') => void;
  parentRoomStyle: ParentRoomStyle;
  setParentRoomStyle: (s: ParentRoomStyle) => void;
  parentMood: string;
  setParentMood: (m: string) => void;
  parentMoodDate: string;
  setParentMoodDate: (d: string) => void;

  // ── Mood ─────────────────────────────────────────────────────
  mood: string;
  setMood: (m: string) => void;
  moodHistory: MoodEntry[];
  setMoodHistory: React.Dispatch<React.SetStateAction<MoodEntry[]>>;

  // ── Journal ──────────────────────────────────────────────────
  journalText: string;
  setJournalText: (t: string) => void;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  parentPagesDraft: string;
  setParentPagesDraft: (t: string) => void;
  parentPagesEntries: JournalEntry[];
  setParentPagesEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;

  // ── Oracle ───────────────────────────────────────────────────
  oracleProfile: OracleProfile;
  setOracleProfile: React.Dispatch<React.SetStateAction<OracleProfile>>;
  parentOracleProfile: OracleProfile;
  setParentOracleProfile: React.Dispatch<React.SetStateAction<OracleProfile>>;
  oracleSessions: OracleSessionSummary[];
  setOracleSessions: React.Dispatch<React.SetStateAction<OracleSessionSummary[]>>;
  parentOracleSessions: OracleSessionSummary[];
  setParentOracleSessions: React.Dispatch<React.SetStateAction<OracleSessionSummary[]>>;
  oracleJournalEntries: OracleJournalEntry[];
  setOracleJournalEntries: React.Dispatch<React.SetStateAction<OracleJournalEntry[]>>;

  // ── Circle ────────────────────────────────────────────────────
  circlePosts: CirclePost[];
  setCirclePosts: React.Dispatch<React.SetStateAction<CirclePost[]>>;
  circlePostText: string;
  setCirclePostText: (t: string) => void;
  parentCirclePosts: ParentCirclePost[];
  setParentCirclePosts: React.Dispatch<React.SetStateAction<ParentCirclePost[]>>;
  parentCirclePostText: string;
  setParentCirclePostText: (t: string) => void;

  // ── Voice / Comfort / Crew ────────────────────────────────────
  voiceNotes: VoiceNote[];
  setVoiceNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  parentVoiceNotes: VoiceNote[];
  setParentVoiceNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  comfortSessions: ComfortSession[];
  setComfortSessions: React.Dispatch<React.SetStateAction<ComfortSession[]>>;
  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  crewCheckIns: CrewCheckIn[];
  setCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;

  // ── Persistence / UI ─────────────────────────────────────────
  streakDays: number;
  setStreakDays: React.Dispatch<React.SetStateAction<number>>;
  lastOpenDate: string;
  setLastOpenDate: (d: string) => void;
  streakJustReset: boolean;
  setStreakJustReset: React.Dispatch<React.SetStateAction<boolean>>;
  roomMemory: RoomMemory;
  setRoomMemory: React.Dispatch<React.SetStateAction<RoomMemory>>;
  homeMessageIndex: number;
  setHomeMessageIndex: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
}
