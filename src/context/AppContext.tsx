/**
 * src/context/AppContext.tsx
 *
 * PHASE 5 FIX: Added all parent state + actions.
 * setUserSide exposed so splash can persist side choice.
 * patchJournalEntry added so onSekretReply can persist Worker replies.
 *
 * TYPE PASS: Removed duplicate JournalEntry + CirclePost declarations.
 * Now imports canonical types from @/types to avoid drift.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Animated } from 'react-native';
import { useSekretState } from '@/hooks/useSekretState';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { HOME_MESSAGES } from '@constants/theme';
import type {
  JournalEntry,
  CirclePost,
  MoodEntry,
  VoiceNote,
  ParentCirclePost,
  ComfortSession,
  CrewMember,
  CrewCheckIn,
} from '@/types';
import type { OracleProfile, OracleSessionSummary } from '@/services/oracleDiscovery';
import type { SavePageInput } from '@screens/PagesScreen';

export type { CirclePost } from '@/types';

interface AppContextValue {
  // Identity
  theme: string;
  setTheme: (theme: string) => void;
  userSide: 'teen' | 'parent' | null;
  setUserSide: (side: 'teen' | 'parent') => void;
  selectedSekret: string;
  setSelectedSekret: (value: string) => void;
  sekretMode: string;
  setSekretMode: (mode: string) => void;

  // Teen mood
  mood: string;
  setMood: (mood: string) => void;
  selectMood: (mood: string) => void;
  moodHistory: MoodEntry[];

  // Journal
  journalText: string;
  setJournalText: (text: string) => void;
  entries: JournalEntry[];
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  saveEntry: () => void;
  /** Merge a partial update into an existing JournalEntry by id. */
  patchJournalEntry: (id: number, patch: Partial<JournalEntry>) => void;

  // Teen voice notes
  voiceNotes: VoiceNote[];
  setVoiceNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;

  // Comfort sessions
  comfortSessions: ComfortSession[];
  setComfortSessions: React.Dispatch<React.SetStateAction<ComfortSession[]>>;

  // Teen circle
  circlePosts: CirclePost[];
  setCirclePosts: React.Dispatch<React.SetStateAction<CirclePost[]>>;

  // Teen Oracle (local-only — stays in AsyncStorage, not Supabase)
  oracleProfile: OracleProfile | null;
  setOracleProfile: (profile: OracleProfile | null) => void;
  oracleSessions: OracleSessionSummary[];
  setOracleSessions: React.Dispatch<React.SetStateAction<OracleSessionSummary[]>>;
  completeTeenOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;

  // UI
  homeMessageIndex: number;
  breatheAnim: Animated.Value;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'failed' | 'local';
  withSyncWrap: (fn: () => Promise<void>) => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;

  // ── Parent state ──────────────────────────────────────────────
  parentMood: string;
  setParentMood: (mood: string) => void;
  parentMoodDate: string;
  setParentMoodDate: (date: string) => void;
  parentRoomStyle: string;
  setParentRoomStyle: (style: string) => void;
  parentPagesDraft: string;
  setParentPagesDraft: (text: string) => void;
  parentPagesEntries: JournalEntry[];
  setParentPagesEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  parentCirclePosts: ParentCirclePost[];
  setParentCirclePosts: React.Dispatch<React.SetStateAction<ParentCirclePost[]>>;
  parentCirclePostText: string;
  setParentCirclePostText: (text: string) => void;
  parentVoiceNotes: VoiceNote[];
  setParentVoiceNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  parentOracleProfile: OracleProfile | null;
  setParentOracleProfile: (profile: OracleProfile | null) => void;
  parentOracleSessions: OracleSessionSummary[];
  setParentOracleSessions: React.Dispatch<React.SetStateAction<OracleSessionSummary[]>>;

  // Crew (teen)
  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  crewCheckIns: CrewCheckIn[];
  setCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;

  // Crew (parent)
  parentCrewMembers: CrewMember[];
  setParentCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  parentCrewCheckIns: CrewCheckIn[];
  setParentCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;

  // Parent actions
  saveParentPageEntry: (entry: SavePageInput) => void;
  saveParentCirclePost: () => void;
  reactToParentPost: (postId: number, reaction: string) => void;
  completeParentOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;

  // Reset
  resetApp: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside <AppProvider>');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [journalText, setJournalText] = useState('');
  const [homeMessageIndex, setHomeMessageIndex] = useState(0);
  const [circlePosts, setCirclePosts] = useState<CirclePost[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const breatheAnim = useRef(new Animated.Value(1)).current;

  const s = useSekretState();
  const { syncStatus, withSyncWrap } = useSyncStatus();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.1, duration: 2200, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1.0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setHomeMessageIndex((p) => (p + 1) % HOME_MESSAGES.length),
      5000
    );
    return () => clearInterval(id);
  }, []);

  function selectMood(m: string) {
    s.setMood(m);
    s.setMoodHistory((h: MoodEntry[]) => [
      { id: Date.now(), mood: m, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() },
      ...h,
    ]);
  }

  function saveEntry() {
    if (!journalText.trim()) return;
    s.setEntries((e: JournalEntry[]) => [
      { id: Date.now(), text: journalText, mood: s.mood, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() },
      ...e,
    ]);
    setJournalText('');
  }

  /**
   * Merge a partial update into an existing JournalEntry by id.
   * Used by onSekretReply to persist Worker replies without replacing the entry.
   */
  function patchJournalEntry(id: number, patch: Partial<JournalEntry>) {
    s.setEntries((prev: JournalEntry[]) =>
      prev.map(entry => entry.id === id ? { ...entry, ...patch } : entry)
    );
  }

  // ── Parent actions ───────────────────────────────────────────────
  function saveParentPageEntry(entry: SavePageInput) {
    if (!entry.text.trim()) return;
    s.setParentPagesEntries((e: JournalEntry[]) => [
      {
        id: entry.id ?? Date.now(),
        text: entry.text,
        mood: s.parentMood,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        source: entry.source,
        entryMode: entry.entryMode,
        moodTag: entry.moodTag,
        locked: entry.locked,
        imageUri: entry.imageUri,
      },
      ...e,
    ]);
    s.setParentPagesDraft('');
  }

  function saveParentCirclePost() {
    if (!s.parentCirclePostText.trim()) return;
    s.setParentCirclePosts((posts: ParentCirclePost[]) => [
      { id: Date.now(), text: s.parentCirclePostText, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), reactions: { felt: 0, support: 0, relate: 0 } },
      ...posts,
    ]);
    s.setParentCirclePostText('');
  }

  function reactToParentPost(postId: number, reaction: string) {
    s.setParentCirclePosts((posts: ParentCirclePost[]) =>
      posts.map(p => p.id === postId
        ? { ...p, reactions: { ...p.reactions, [reaction]: ((p.reactions as Record<string, number>)[reaction] ?? 0) + 1 } }
        : p
      )
    );
  }

  function completeTeenOracleSession(profile: OracleProfile, session: OracleSessionSummary) {
    s.setOracleSessions((sessions: OracleSessionSummary[]) => [session, ...sessions].slice(0, 50));
    s.setOracleProfile(profile);
  }

  function completeParentOracleSession(profile: OracleProfile, session: OracleSessionSummary) {
    s.setParentOracleSessions((sessions: OracleSessionSummary[]) => [session, ...sessions].slice(0, 50));
    s.setParentOracleProfile(profile);
  }

  function resetApp() {
    s.resetAllState();
    setJournalText('');
    setCirclePosts([]);
    setVoiceNotes([]);
    setNotificationsEnabled(false);
  }

  const value: AppContextValue = {
    theme: s.theme,
    setTheme: s.setTheme,
    userSide: s.userSide,
    setUserSide: s.setUserSide,
    selectedSekret: s.selectedSekret,
    setSelectedSekret: s.setSelectedSekret,
    sekretMode: s.sekretMode,
    setSekretMode: s.setSekretMode,
    mood: s.mood,
    setMood: s.setMood,
    selectMood,
    moodHistory: s.moodHistory,
    journalText,
    setJournalText,
    entries: s.entries,
    setEntries: s.setEntries,
    saveEntry,
    patchJournalEntry,
    voiceNotes,
    setVoiceNotes,
    comfortSessions: s.comfortSessions,
    setComfortSessions: s.setComfortSessions,
    circlePosts,
    setCirclePosts,
    oracleProfile: s.oracleProfile,
    setOracleProfile: s.setOracleProfile,
    oracleSessions: s.oracleSessions,
    setOracleSessions: s.setOracleSessions,
    completeTeenOracleSession,
    homeMessageIndex,
    breatheAnim,
    isLoading: s.isLoading,
    syncStatus,
    withSyncWrap,
    notificationsEnabled,
    setNotificationsEnabled,
    // parent
    parentMood: s.parentMood,
    setParentMood: s.setParentMood,
    parentMoodDate: s.parentMoodDate,
    setParentMoodDate: s.setParentMoodDate,
    parentRoomStyle: s.parentRoomStyle,
    setParentRoomStyle: s.setParentRoomStyle,
    parentPagesDraft: s.parentPagesDraft,
    setParentPagesDraft: s.setParentPagesDraft,
    parentPagesEntries: s.parentPagesEntries,
    setParentPagesEntries: s.setParentPagesEntries,
    parentCirclePosts: s.parentCirclePosts,
    setParentCirclePosts: s.setParentCirclePosts,
    parentCirclePostText: s.parentCirclePostText,
    setParentCirclePostText: s.setParentCirclePostText,
    parentVoiceNotes: s.parentVoiceNotes,
    setParentVoiceNotes: s.setParentVoiceNotes,
    parentOracleProfile: s.parentOracleProfile,
    setParentOracleProfile: s.setParentOracleProfile,
    parentOracleSessions: s.parentOracleSessions,
    setParentOracleSessions: s.setParentOracleSessions,
    crewMembers: s.crewMembers,
    setCrewMembers: s.setCrewMembers,
    crewCheckIns: s.crewCheckIns,
    setCrewCheckIns: s.setCrewCheckIns,
    parentCrewMembers: s.parentCrewMembers,
    setParentCrewMembers: s.setParentCrewMembers,
    parentCrewCheckIns: s.parentCrewCheckIns,
    setParentCrewCheckIns: s.setParentCrewCheckIns,
    saveParentPageEntry,
    saveParentCirclePost,
    reactToParentPost,
    completeParentOracleSession,
    resetApp,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
