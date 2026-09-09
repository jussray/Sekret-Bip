/**
 * Canonical mounted state for the Expo Router application.
 *
 * Local storage remains the offline cache. A permanent Supabase account is the
 * cross-device source of truth for feature records. This hook is intentionally
 * the one active state path used by AppContext; older parallel state modules are
 * preserved for migration reference but are not mounted.
 */
import { useEffect, useState } from 'react';
import { loadState, saveState } from '@/utils';
import { loadJournalEntries } from '@/features/journal/journalRepository';
import { mergeById } from '@/utils/mergeById';
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import { loadPeriodDays, pullAll } from '@/utils/sync';
import { DEFAULT_ROOM_MEMORY, type RoomMemory } from '@/types/roomMemory';
import type {
  JournalEntry,
  MoodEntry,
  CirclePost,
  VoiceNote,
  ParentCirclePost,
  ComfortSession,
  CrewMember,
  CrewCheckIn,
} from '@/types';
import type { OracleProfile, OracleSessionSummary } from '@/services/oracleDiscovery';

function parseRoomMemory(value: unknown): RoomMemory | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object'
      ? { ...DEFAULT_ROOM_MEMORY, ...(parsed as Partial<RoomMemory>) }
      : null;
  } catch {
    return null;
  }
}

export function useSekretState() {
  const [theme, setTheme] = useState('neon');
  const [mood, setMood] = useState('Happy');
  const [userSide, setUserSide] = useState<'teen' | 'parent' | null>(null);
  const [selectedSekret, setSelectedSekret] = useState('soft');
  const [sekretMode, setSekretMode] = useState('soft');
  const [growthPath, setGrowthPath] = useState('preferNotToSay');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [circlePosts, setCirclePosts] = useState<CirclePost[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [comfortSessions, setComfortSessions] = useState<ComfortSession[]>([]);
  const [periodDays, setPeriodDays] = useState<string[]>([]);
  const [roomMemory, setRoomMemory] = useState<RoomMemory>(DEFAULT_ROOM_MEMORY);
  const [isLoading, setIsLoading] = useState(true);

  // Parent-owned state stays distinct from Teen-owned private state.
  const [parentMood, setParentMood] = useState('Calm');
  const [parentMoodDate, setParentMoodDate] = useState('');
  const [parentRoomStyle, setParentRoomStyle] = useState('mom');
  const [parentPagesDraft, setParentPagesDraft] = useState('');
  const [parentPagesEntries, setParentPagesEntries] = useState<JournalEntry[]>([]);
  const [parentCirclePosts, setParentCirclePosts] = useState<ParentCirclePost[]>([]);
  const [parentCirclePostText, setParentCirclePostText] = useState('');
  const [parentVoiceNotes, setParentVoiceNotes] = useState<VoiceNote[]>([]);
  const [oracleProfile, setOracleProfile] = useState<OracleProfile | null>(null);
  const [oracleSessions, setOracleSessions] = useState<OracleSessionSummary[]>([]);
  const [parentOracleProfile, setParentOracleProfile] = useState<OracleProfile | null>(null);
  const [parentOracleSessions, setParentOracleSessions] = useState<OracleSessionSummary[]>([]);

  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [crewCheckIns, setCrewCheckIns] = useState<CrewCheckIn[]>([]);
  const [parentCrewMembers, setParentCrewMembers] = useState<CrewMember[]>([]);
  const [parentCrewCheckIns, setParentCrewCheckIns] = useState<CrewCheckIn[]>([]);

  // Hydrate the device cache first so the app remains responsive offline.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const state = await loadState();
        if (cancelled) return;

        if (state.theme) setTheme(state.theme);
        if (state.mood) setMood(state.mood);
        if (state.userSide) setUserSide(state.userSide);
        if (state.selectedSekret) setSelectedSekret(state.selectedSekret);
        if (state.sekretMode) setSekretMode(state.sekretMode);
        if (state.growthPath) setGrowthPath(state.growthPath);
        if (Array.isArray(state.entries)) setEntries(state.entries);
        if (Array.isArray(state.moodHistory)) setMoodHistory(state.moodHistory);
        if (Array.isArray(state.circlePosts)) setCirclePosts(state.circlePosts);
        if (Array.isArray(state.voiceNotes)) setVoiceNotes(state.voiceNotes);
        if (Array.isArray(state.comfortSessions)) setComfortSessions(state.comfortSessions);
        if (Array.isArray(state.periodDays)) setPeriodDays(state.periodDays);

        const cachedRoomMemory = parseRoomMemory(state.roomMemory);
        if (cachedRoomMemory) setRoomMemory(cachedRoomMemory);

        if (state.parentMood) setParentMood(state.parentMood);
        if (state.parentMoodDate) setParentMoodDate(state.parentMoodDate);
        if (state.parentRoomStyle === 'mom' || state.parentRoomStyle === 'dad') {
          setParentRoomStyle(state.parentRoomStyle);
        }
        if (state.parentPagesDraft) setParentPagesDraft(state.parentPagesDraft);
        if (Array.isArray(state.parentPagesEntries)) setParentPagesEntries(state.parentPagesEntries);
        if (Array.isArray(state.parentCirclePosts)) setParentCirclePosts(state.parentCirclePosts);
        if (state.parentCirclePostText) setParentCirclePostText(state.parentCirclePostText);
        if (Array.isArray(state.parentVoiceNotes)) setParentVoiceNotes(state.parentVoiceNotes);
        if (state.oracleProfile) setOracleProfile(state.oracleProfile);
        if (Array.isArray(state.oracleSessions)) setOracleSessions(state.oracleSessions);
        if (state.parentOracleProfile) setParentOracleProfile(state.parentOracleProfile);
        if (Array.isArray(state.parentOracleSessions)) setParentOracleSessions(state.parentOracleSessions);
        if (Array.isArray(state.crewMembers)) setCrewMembers(state.crewMembers);
        if (Array.isArray(state.crewCheckIns)) setCrewCheckIns(state.crewCheckIns);
        if (Array.isArray(state.parentCrewMembers)) setParentCrewMembers(state.parentCrewMembers);
        if (Array.isArray(state.parentCrewCheckIns)) setParentCrewCheckIns(state.parentCrewCheckIns);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Once local hydration is complete, merge durable account data from Supabase.
  useEffect(() => {
    if (isLoading || !isSupabaseConfigured) return;
    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const user = data.session?.user;
        if (!user || user.is_anonymous || cancelled) return;

        const [cloud, teenPages, parentPages, cloudPeriodDays] = await Promise.all([
          pullAll(),
          loadJournalEntries('teen').catch(() => []),
          loadJournalEntries('parent').catch(() => []),
          loadPeriodDays().catch(() => []),
        ]);

        if (cancelled) return;

        if (cloud) {
          setMoodHistory(current => mergeById(current, cloud.moodHistory));
          setEntries(current => mergeById(
            current,
            teenPages.length > 0 ? teenPages : cloud.journalEntries,
          ));
          setCirclePosts(current => mergeById(current, cloud.circlePosts));
          setParentCirclePosts(current => mergeById(current, cloud.parentCirclePosts));
          setVoiceNotes(current => mergeById(current, cloud.voiceNotes));
          setComfortSessions(current => mergeById(current, cloud.comfortSessions));
          setCrewMembers(current => mergeById(current, cloud.crewMembers));
          setCrewCheckIns(current => mergeById(current, cloud.crewCheckIns));
          if (cloud.roomMemory) {
            setRoomMemory(current => ({ ...current, ...cloud.roomMemory }));
          }
        }

        if (parentPages.length > 0) {
          setParentPagesEntries(current => mergeById(current, parentPages));
        }
        if (cloudPeriodDays.length > 0) {
          setPeriodDays(current => [...new Set([...current, ...cloudPeriodDays])].sort());
        }
      } catch (error) {
        if (__DEV__) console.warn('[state] cloud hydration failed', error);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoading]);

  // Persist the merged state as the offline cache.
  useEffect(() => {
    if (isLoading) return;

    void saveState({
      theme,
      mood,
      userSide,
      selectedSekret,
      sekretMode,
      growthPath,
      entries,
      moodHistory,
      circlePosts,
      voiceNotes,
      comfortSessions,
      periodDays,
      roomMemory,
      oracleProfile,
      oracleSessions,
      parentMood,
      parentMoodDate,
      parentRoomStyle,
      parentPagesDraft,
      parentPagesEntries,
      parentCirclePosts,
      parentCirclePostText,
      parentVoiceNotes,
      parentOracleProfile,
      parentOracleSessions,
      crewMembers,
      crewCheckIns,
      parentCrewMembers,
      parentCrewCheckIns,
    });
  }, [
    theme, mood, userSide, selectedSekret, sekretMode, growthPath,
    entries, moodHistory, circlePosts, voiceNotes, comfortSessions,
    periodDays, roomMemory, oracleProfile, oracleSessions,
    parentMood, parentMoodDate, parentRoomStyle, parentPagesDraft,
    parentPagesEntries, parentCirclePosts, parentCirclePostText,
    parentVoiceNotes, parentOracleProfile, parentOracleSessions,
    crewMembers, crewCheckIns, parentCrewMembers, parentCrewCheckIns,
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
    setVoiceNotes([]);
    setComfortSessions([]);
    setPeriodDays([]);
    setRoomMemory(DEFAULT_ROOM_MEMORY);
    setParentMood('Calm');
    setParentMoodDate('');
    setParentRoomStyle('mom');
    setParentPagesDraft('');
    setParentPagesEntries([]);
    setParentCirclePosts([]);
    setParentCirclePostText('');
    setParentVoiceNotes([]);
    setOracleProfile(null);
    setOracleSessions([]);
    setParentOracleProfile(null);
    setParentOracleSessions([]);
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
    voiceNotes, setVoiceNotes,
    comfortSessions, setComfortSessions,
    periodDays, setPeriodDays,
    roomMemory, setRoomMemory,
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
    crewMembers, setCrewMembers,
    crewCheckIns, setCrewCheckIns,
    parentCrewMembers, setParentCrewMembers,
    parentCrewCheckIns, setParentCrewCheckIns,
    isLoading,
    resetAllState,
  };
}
