import { useState, useEffect } from 'react';
import { loadState, saveState } from '@/utils/storage';
import { normalizeVibeKey } from '../constants/theme';
import {
  createOracleProfile,
  normalizeOracleProfile,
  normalizeOracleSessions,
  type OracleProfile,
  type OracleSessionSummary,
} from '../services/oracleDiscovery';
import { normalizeOracleJournalEntries } from '../services/voiceBipIntelligence';
import { DEFAULT_ROOM_MEMORY, type RoomMemory } from '../types/roomMemory';
import type { JournalEntry, CirclePost, ParentCirclePost, VoiceNote, MoodEntry, ComfortSession, CrewMember, CrewCheckIn } from '../types/index';
import type { OracleJournalEntry } from '../types/voiceIntelligence';
import type { ParentRoomStyle } from '@screens/ParentRoomScreen';

export function useAppState() {
  const [screen, setScreen]                   = useState('splash');
  const [theme, setTheme]                     = useState('raylene');
  const [selectedSekret, setSelectedSekret]   = useState('soft');
  const [sekretMode, setSekretMode]           = useState('soft');
  const [userSide, setUserSide]               = useState<'teen' | 'parent'>('teen');
  const [parentRoomStyle, setParentRoomStyle] = useState<ParentRoomStyle>('mom');
  const [parentMood, setParentMood]           = useState('');
  const [parentMoodDate, setParentMoodDate]   = useState('');

  const [mood, setMood]               = useState('Happy');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  const [journalText, setJournalText]               = useState('');
  const [journalEntries, setJournalEntries]         = useState<JournalEntry[]>([]);
  const [parentPagesDraft, setParentPagesDraft]     = useState('');
  const [parentPagesEntries, setParentPagesEntries] = useState<JournalEntry[]>([]);
  const [oracleJournalEntries, setOracleJournalEntries] = useState<OracleJournalEntry[]>([]);
  const [oracleProfile, setOracleProfile]           = useState<OracleProfile>(() => createOracleProfile('teen'));
  const [parentOracleProfile, setParentOracleProfile] = useState<OracleProfile>(() => createOracleProfile('parent'));
  const [oracleSessions, setOracleSessions]         = useState<OracleSessionSummary[]>([]);
  const [parentOracleSessions, setParentOracleSessions] = useState<OracleSessionSummary[]>([]);

  const [circlePosts, setCirclePosts]                     = useState<CirclePost[]>([]);
  const [circlePostText, setCirclePostText]               = useState('');
  const [parentCirclePosts, setParentCirclePosts]         = useState<ParentCirclePost[]>([]);
  const [parentCirclePostText, setParentCirclePostText]   = useState('');

  const [voiceNotes, setVoiceNotes]             = useState<VoiceNote[]>([]);
  const [parentVoiceNotes, setParentVoiceNotes] = useState<VoiceNote[]>([]);
  const [comfortSessions, setComfortSessions]   = useState<ComfortSession[]>([]);
  const [crewMembers, setCrewMembers]           = useState<CrewMember[]>([]);
  const [crewCheckIns, setCrewCheckIns]         = useState<CrewCheckIn[]>([]);

  // Period calendar — array of ISO date strings e.g. ['2026-06-01', '2026-06-02']
  const [periodDays, setPeriodDays] = useState<string[]>([]);

  const [streakDays, setStreakDays]               = useState(0);
  const [lastOpenDate, setLastOpenDate]           = useState('');
  const [streakJustReset, setStreakJustReset]     = useState(false);
  const [roomMemory, setRoomMemory]               = useState<RoomMemory>(DEFAULT_ROOM_MEMORY);
  const [homeMessageIndex, setHomeMessageIndex]   = useState(0);
  const [isLoading, setIsLoading]                 = useState(true);

  // ── Load persisted state on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const state = await loadState();
        if (state.theme)          setTheme(normalizeVibeKey(state.theme));
        if (state.mood)           setMood(state.mood);
        if (state.userSide)       setUserSide(state.userSide);
        if (state.selectedSekret) setSelectedSekret(state.selectedSekret);
        if (state.sekretMode)     setSekretMode(state.sekretMode);
        if (state.journalText)    setJournalText(state.journalText);
        if (state.entries)        setJournalEntries(Array.isArray(state.entries) ? state.entries : []);
        if (state.parentPagesDraft)    setParentPagesDraft(state.parentPagesDraft);
        if (state.parentPagesEntries)  setParentPagesEntries(Array.isArray(state.parentPagesEntries) ? state.parentPagesEntries : []);
        if (state.oracleJournalEntries) setOracleJournalEntries(normalizeOracleJournalEntries(state.oracleJournalEntries, 'teen'));
        if (state.oracleProfile)        setOracleProfile(normalizeOracleProfile(state.oracleProfile, 'teen'));
        if (state.parentOracleProfile)  setParentOracleProfile(normalizeOracleProfile(state.parentOracleProfile, 'parent'));
        if (state.oracleSessions)       setOracleSessions(normalizeOracleSessions(state.oracleSessions, 'teen'));
        if (state.parentOracleSessions) setParentOracleSessions(normalizeOracleSessions(state.parentOracleSessions, 'parent'));
        if (state.moodHistory)          setMoodHistory(Array.isArray(state.moodHistory) ? state.moodHistory : []);
        if (state.circlePosts)          setCirclePosts(Array.isArray(state.circlePosts) ? state.circlePosts : []);
        if (state.parentCirclePosts)    setParentCirclePosts(Array.isArray(state.parentCirclePosts) ? state.parentCirclePosts : []);
        if (state.voiceNotes)           setVoiceNotes(Array.isArray(state.voiceNotes) ? state.voiceNotes : []);
        if (state.parentVoiceNotes)     setParentVoiceNotes(Array.isArray(state.parentVoiceNotes) ? state.parentVoiceNotes : []);
        if (state.comfortSessions)      setComfortSessions(Array.isArray(state.comfortSessions) ? state.comfortSessions : []);
        if (state.crewMembers)          setCrewMembers(Array.isArray(state.crewMembers) ? state.crewMembers : []);
        if (state.crewCheckIns)         setCrewCheckIns(Array.isArray(state.crewCheckIns) ? state.crewCheckIns : []);
        if (state.periodDays)           setPeriodDays(Array.isArray(state.periodDays) ? state.periodDays : []);
        if (state.streakDays)           setStreakDays(Number(state.streakDays) || 0);
        if (state.lastOpenDate)         setLastOpenDate(state.lastOpenDate);
        if (state.roomMemory) {
          const rm = typeof state.roomMemory === 'string' ? JSON.parse(state.roomMemory) : state.roomMemory;
          setRoomMemory(rm);
        }
        if (state.parentRoomStyle === 'mom' || state.parentRoomStyle === 'dad') {
          setParentRoomStyle(state.parentRoomStyle as ParentRoomStyle);
        }
        if (state.parentMood)     setParentMood(state.parentMood);
        if (state.parentMoodDate) setParentMoodDate(state.parentMoodDate);
      } catch { /* continue with defaults */ }
      setIsLoading(false);
    })();
  }, []);

  // ── Persist all state to AsyncStorage after initial hydration ────────────
  useEffect(() => {
    if (isLoading) return;
    void saveState({
      theme, mood, userSide, selectedSekret, sekretMode,
      journalText,
      entries: journalEntries,
      parentPagesDraft, parentPagesEntries,
      oracleJournalEntries, oracleProfile, parentOracleProfile,
      oracleSessions, parentOracleSessions,
      moodHistory, circlePosts, parentCirclePosts,
      voiceNotes, parentVoiceNotes,
      comfortSessions, crewMembers, crewCheckIns,
      streakDays, lastOpenDate, roomMemory,
      parentRoomStyle, parentMood, parentMoodDate,
    });
  }, [
    isLoading, theme, mood, userSide, selectedSekret, sekretMode,
    journalText, journalEntries, parentPagesDraft, parentPagesEntries,
    oracleJournalEntries, oracleProfile, parentOracleProfile,
    oracleSessions, parentOracleSessions,
    moodHistory, circlePosts, parentCirclePosts,
    voiceNotes, parentVoiceNotes, comfortSessions, crewMembers, crewCheckIns,
    streakDays, lastOpenDate, roomMemory, parentRoomStyle, parentMood, parentMoodDate,
  ]);

  return {
    screen, setScreen,
    theme, setTheme,
    selectedSekret, setSelectedSekret,
    sekretMode, setSekretMode,
    userSide, setUserSide,
    parentRoomStyle, setParentRoomStyle,
    parentMood, setParentMood,
    parentMoodDate, setParentMoodDate,
    mood, setMood,
    moodHistory, setMoodHistory,
    journalText, setJournalText,
    journalEntries, setJournalEntries,
    parentPagesDraft, setParentPagesDraft,
    parentPagesEntries, setParentPagesEntries,
    oracleJournalEntries, setOracleJournalEntries,
    oracleProfile, setOracleProfile,
    parentOracleProfile, setParentOracleProfile,
    oracleSessions, setOracleSessions,
    parentOracleSessions, setParentOracleSessions,
    circlePosts, setCirclePosts,
    circlePostText, setCirclePostText,
    parentCirclePosts, setParentCirclePosts,
    parentCirclePostText, setParentCirclePostText,
    voiceNotes, setVoiceNotes,
    parentVoiceNotes, setParentVoiceNotes,
    comfortSessions, setComfortSessions,
    crewMembers, setCrewMembers,
    crewCheckIns, setCrewCheckIns,
    periodDays, setPeriodDays,
    streakDays, setStreakDays,
    lastOpenDate, setLastOpenDate,
    streakJustReset, setStreakJustReset,
    roomMemory, setRoomMemory,
    homeMessageIndex, setHomeMessageIndex,
    isLoading,
  };
}
