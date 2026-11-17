/**
 * src/hooks/useSekretState.ts
 *
 * PHASE 5 FIX: Added all parent state fields + persistence.
 * setUserSide is now exposed so app/index.tsx can call it on splash.
 *
 * TYPE PASS: Replaced all any[] arrays with proper imported types.
 */
import { useState, useEffect } from 'react';
import { loadState, saveState } from '@/utils';
import type {
  JournalEntry,
  MoodEntry,
  CirclePost,
  VoiceNote,
  ParentCirclePost,
  CrewMember,
  CrewCheckIn,
} from '@/types';
import type { OracleProfile, OracleSessionSummary } from '@/services/oracleDiscovery';

export function useSekretState() {
  const [theme, setTheme]                   = useState('neon');
  const [mood, setMood]                     = useState('Happy');
  const [userSide, setUserSide]             = useState<'teen' | 'parent' | null>(null);
  const [selectedSekret, setSelectedSekret] = useState('soft');
  const [sekretMode, setSekretMode]         = useState('soft');
  const [growthPath, setGrowthPath]         = useState('preferNotToSay');
  const [entries, setEntries]               = useState<JournalEntry[]>([]);
  const [moodHistory, setMoodHistory]       = useState<MoodEntry[]>([]);
  const [circlePosts, setCirclePosts]       = useState<CirclePost[]>([]);
  const [isLoading, setIsLoading]           = useState(true);

  // ── Parent state ──────────────────────────────────────────────
  const [parentMood, setParentMood]                     = useState('Calm');
  const [parentMoodDate, setParentMoodDate]             = useState('');
  const [parentRoomStyle, setParentRoomStyle]           = useState('forest');
  const [parentPagesDraft, setParentPagesDraft]         = useState('');
  const [parentPagesEntries, setParentPagesEntries]     = useState<JournalEntry[]>([]);
  const [parentCirclePosts, setParentCirclePosts]       = useState<ParentCirclePost[]>([]);
  const [parentCirclePostText, setParentCirclePostText] = useState('');
  const [parentVoiceNotes, setParentVoiceNotes]         = useState<VoiceNote[]>([]);
  const [oracleProfile, setOracleProfile]               = useState<OracleProfile | null>(null);
  const [oracleSessions, setOracleSessions]             = useState<OracleSessionSummary[]>([]);
  const [parentOracleProfile, setParentOracleProfile]   = useState<OracleProfile | null>(null);
  const [parentOracleSessions, setParentOracleSessions] = useState<OracleSessionSummary[]>([]);

  // ── Crew state (teen + parent, separate lists) ────────────────────────────
  const [comfortSessions, setComfortSessions]       = useState<import('@/types').ComfortSession[]>([]);
  const [crewMembers, setCrewMembers]               = useState<CrewMember[]>([]);
  const [crewCheckIns, setCrewCheckIns]             = useState<CrewCheckIn[]>([]);
  const [parentCrewMembers, setParentCrewMembers]   = useState<CrewMember[]>([]);
  const [parentCrewCheckIns, setParentCrewCheckIns] = useState<CrewCheckIn[]>([]);

  // Load persisted state on mount
  useEffect(() => {
    (async () => {
      const state = await loadState();
      if (state.theme)                setTheme(state.theme);
      if (state.mood)                 setMood(state.mood);
      if (state.userSide)             setUserSide(state.userSide);
      if (state.selectedSekret)       setSelectedSekret(state.selectedSekret);
      if (state.sekretMode)           setSekretMode(state.sekretMode);
      if (state.growthPath)           setGrowthPath(state.growthPath);
      if (state.entries)              setEntries(state.entries);
      if (state.moodHistory)          setMoodHistory(state.moodHistory);
      if (state.circlePosts)          setCirclePosts(state.circlePosts);
      // parent
      if (state.parentMood)             setParentMood(state.parentMood);
      if (state.parentMoodDate)         setParentMoodDate(state.parentMoodDate);
      if (state.parentRoomStyle)        setParentRoomStyle(state.parentRoomStyle);
      if (state.parentPagesDraft)       setParentPagesDraft(state.parentPagesDraft);
      if (state.parentPagesEntries)     setParentPagesEntries(state.parentPagesEntries);
      if (state.parentCirclePosts)      setParentCirclePosts(state.parentCirclePosts);
      if (state.parentCirclePostText)   setParentCirclePostText(state.parentCirclePostText);
      if (state.parentVoiceNotes)       setParentVoiceNotes(state.parentVoiceNotes);
      if (state.oracleProfile)           setOracleProfile(state.oracleProfile);
      if (state.oracleSessions)          setOracleSessions(state.oracleSessions);
      if (state.parentOracleProfile)    setParentOracleProfile(state.parentOracleProfile);
      if (state.parentOracleSessions)   setParentOracleSessions(state.parentOracleSessions);
      if (Array.isArray(state.comfortSessions))     setComfortSessions(state.comfortSessions);
      if (Array.isArray(state.crewMembers))        setCrewMembers(state.crewMembers);
      if (Array.isArray(state.crewCheckIns))       setCrewCheckIns(state.crewCheckIns);
      if (Array.isArray(state.parentCrewMembers))  setParentCrewMembers(state.parentCrewMembers);
      if (Array.isArray(state.parentCrewCheckIns)) setParentCrewCheckIns(state.parentCrewCheckIns);
      setIsLoading(false);
    })();
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!isLoading) {
      saveState({
        theme, mood, userSide, selectedSekret, sekretMode,
        growthPath, entries, moodHistory, circlePosts,
        oracleProfile, oracleSessions,
        parentMood, parentMoodDate, parentRoomStyle,
        parentPagesDraft, parentPagesEntries,
        parentCirclePosts, parentCirclePostText,
        parentVoiceNotes, parentOracleProfile, parentOracleSessions,
        comfortSessions,
        crewMembers, crewCheckIns,
        parentCrewMembers, parentCrewCheckIns,
      });
    }
  }, [
    theme, mood, userSide, selectedSekret, sekretMode,
    growthPath, entries, moodHistory, circlePosts,
    oracleProfile, oracleSessions,
    parentMood, parentMoodDate, parentRoomStyle,
    parentPagesDraft, parentPagesEntries,
    parentCirclePosts, parentCirclePostText,
    parentVoiceNotes, parentOracleProfile, parentOracleSessions,
    comfortSessions,
    crewMembers, crewCheckIns,
    parentCrewMembers, parentCrewCheckIns,
    isLoading,
  ]);

  function resetAllState() {
    setTheme('neon');
    setMood('Happy');
    setUserSide(null);
    setSelectedSekret('soft');
    setSekretMode('soft');
    setGrowthPath('preferNotToSay');
    setEntries([]);
    setMoodHistory([]);
    setCirclePosts([]);
    setParentMood('Calm');
    setParentMoodDate('');
    setParentRoomStyle('forest');
    setParentPagesDraft('');
    setParentPagesEntries([]);
    setParentCirclePosts([]);
    setParentCirclePostText('');
    setParentVoiceNotes([]);
    setOracleProfile(null);
    setOracleSessions([]);
    setParentOracleProfile(null);
    setParentOracleSessions([]);
    setComfortSessions([]);
    setCrewMembers([]);
    setCrewCheckIns([]);
    setParentCrewMembers([]);
    setParentCrewCheckIns([]);
  }

  return {
    theme, setTheme,
    mood, setMood,
    userSide, setUserSide,
    selectedSekret, setSelectedSekret,
    sekretMode, setSekretMode,
    growthPath, setGrowthPath,
    entries, setEntries,
    moodHistory, setMoodHistory,
    circlePosts, setCirclePosts,
    // parent
    parentMood, setParentMood,
    parentMoodDate, setParentMoodDate,
    parentRoomStyle, setParentRoomStyle,
    parentPagesDraft, setParentPagesDraft,
    parentPagesEntries, setParentPagesEntries,
    parentCirclePosts, setParentCirclePosts,
    parentCirclePostText, setParentCirclePostText,
    parentVoiceNotes, setParentVoiceNotes,
    oracleProfile, setOracleProfile,
    oracleSessions, setOracleSessions,
    parentOracleProfile, setParentOracleProfile,
    parentOracleSessions, setParentOracleSessions,
    comfortSessions, setComfortSessions,
    crewMembers, setCrewMembers,
    crewCheckIns, setCrewCheckIns,
    parentCrewMembers, setParentCrewMembers,
    parentCrewCheckIns, setParentCrewCheckIns,
    isLoading,
    resetAllState,
  };
}
