import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HOME_MESSAGES } from '@constants/theme';
import { useSekretState } from '@/hooks/useSekretState';
import { useStreak } from '@/hooks/useStreak';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import { initPointLedger } from '@/features/activity/ledger';
import { upsertJournalEntry } from '@/features/journal/journalRepository';
import {
  syncMood,
  syncParentCirclePost,
  syncRoomMemory,
} from '@/utils/sync';
import { syncOracleDiscovery } from '@/services/oracleDiscovery';
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
import type { RoomMemory } from '@/types/roomMemory';
import type { OracleProfile, OracleSessionSummary } from '@/services/oracleDiscovery';
import type { SavePageInput } from '@screens/PagesScreen';

export type { CirclePost } from '@/types';

interface AppContextValue {
  theme: string;
  setTheme: (theme: string) => void;
  userSide: 'teen' | 'parent' | null;
  setUserSide: (side: 'teen' | 'parent') => void;
  selectedSekret: string;
  setSelectedSekret: (value: string) => void;
  sekretMode: string;
  setSekretMode: (mode: string) => void;

  mood: string;
  setMood: (mood: string) => void;
  selectMood: (mood: string) => void;
  moodHistory: MoodEntry[];

  journalText: string;
  setJournalText: (text: string) => void;
  entries: JournalEntry[];
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  saveEntry: () => void;
  patchJournalEntry: (id: number, patch: Partial<JournalEntry>) => void;

  voiceNotes: VoiceNote[];
  setVoiceNotes: React.Dispatch<React.SetStateAction<VoiceNote[]>>;
  circlePosts: CirclePost[];
  setCirclePosts: React.Dispatch<React.SetStateAction<CirclePost[]>>;
  comfortSessions: ComfortSession[];
  periodDays: string[];
  roomMemory: RoomMemory;
  updateRoomMemory: (patch: Partial<RoomMemory>) => void;

  oracleProfile: OracleProfile | null;
  setOracleProfile: (profile: OracleProfile | null) => void;
  oracleSessions: OracleSessionSummary[];
  setOracleSessions: React.Dispatch<React.SetStateAction<OracleSessionSummary[]>>;
  completeTeenOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;

  homeMessageIndex: number;
  breatheAnim: Animated.Value;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'failed' | 'local';
  withSyncWrap: (fn: () => Promise<void>) => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;

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

  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  crewCheckIns: CrewCheckIn[];
  setCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;
  parentCrewMembers: CrewMember[];
  setParentCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  parentCrewCheckIns: CrewCheckIn[];
  setParentCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;

  saveParentPageEntry: (entry: SavePageInput) => void;
  saveParentCirclePost: () => void;
  reactToParentPost: (postId: number, reaction: string) => void;
  completeParentOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;

  teenGender: 'girl' | 'boy' | 'other' | null;
  resetApp: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside <AppProvider>');
  return context;
}

function nowLabel() {
  const now = new Date();
  return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [journalText, setJournalText] = useState('');
  const [homeMessageIndex, setHomeMessageIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [teenGender, setTeenGender] = useState<'girl' | 'boy' | 'other' | null>(null);
  const breatheAnim = useRef(new Animated.Value(1)).current;

  const state = useSekretState();
  const { streakDays } = useStreak();
  const { syncStatus, withSyncWrap } = useSyncStatus();

  useEffect(() => {
    AsyncStorage.getItem('teen_profile_data').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as { gender?: string };
        if (data.gender === 'girl' || data.gender === 'boy' || data.gender === 'other') {
          setTeenGender(data.gender);
        }
      } catch {
        // Corrupt cache does not block the signed-in profile or app shell.
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.1, duration: 2200, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheAnim]);

  useEffect(() => {
    const id = setInterval(
      () => setHomeMessageIndex(current => (current + 1) % HOME_MESSAGES.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.isLoading || state.userSide !== 'teen') return;
    return initPointLedger({
      moodCount: state.moodHistory.length,
      journalCount: state.entries.length,
      voiceCount: state.voiceNotes.length,
      circleCount: state.circlePosts.length,
      comfortCount: state.comfortSessions.length,
      crewCount: state.crewCheckIns.length,
      streakDays,
    });
  }, [
    state.isLoading,
    state.userSide,
    state.moodHistory.length,
    state.entries.length,
    state.voiceNotes.length,
    state.circlePosts.length,
    state.comfortSessions.length,
    state.crewCheckIns.length,
    streakDays,
  ]);

  function selectMood(mood: string) {
    const timestamp = nowLabel();
    const entry: MoodEntry = { id: Date.now(), mood, ...timestamp };
    state.setMood(mood);
    state.setMoodHistory(current => [entry, ...current]);
    void withSyncWrap(async () => syncMood(entry));
  }

  function saveEntry() {
    const text = journalText.trim();
    if (!text) return;

    const entry: JournalEntry = {
      id: Date.now(),
      text,
      mood: state.mood,
      ...nowLabel(),
      source: 'me',
      activeTab: 'me',
      entryMode: 'typed',
    };

    state.setEntries(current => [entry, ...current]);
    setJournalText('');
    void withSyncWrap(() => upsertJournalEntry(entry, 'teen'));
  }

  function patchJournalEntry(id: number, patch: Partial<JournalEntry>) {
    state.setEntries(current => {
      const next = current.map(entry => entry.id === id ? { ...entry, ...patch } : entry);
      const patched = next.find(entry => entry.id === id);
      if (patched) void withSyncWrap(() => upsertJournalEntry(patched, 'teen'));
      return next;
    });
  }

  function saveParentPageEntry(input: SavePageInput) {
    if (!input.text.trim() && !input.imageUri) return;

    const entry: JournalEntry = {
      id: Date.now(),
      text: input.text.trim(),
      mood: state.parentMood || 'Calm',
      ...nowLabel(),
      source: input.source,
      activeTab: input.source,
      entryMode: input.entryMode,
      moodTag: input.moodTag,
      locked: input.locked,
      imageUri: input.imageUri,
    };

    state.setParentPagesEntries(current => [entry, ...current]);
    state.setParentPagesDraft('');
    void withSyncWrap(() => upsertJournalEntry(entry, 'parent'));
  }

  function saveParentCirclePost() {
    const text = state.parentCirclePostText.trim();
    if (!text) return;

    const post: ParentCirclePost = {
      id: Date.now(),
      text,
      ...nowLabel(),
      reactions: {
        beenThere: 0,
        solidarity: 0,
        reminder: 0,
        needed: 0,
        strength: 0,
      },
    };

    state.setParentCirclePosts(current => [post, ...current]);
    state.setParentCirclePostText('');
    void withSyncWrap(async () => syncParentCirclePost(post));
  }

  function reactToParentPost(postId: number, reaction: string) {
    state.setParentCirclePosts(current => {
      const next = current.map(post => post.id === postId
        ? {
            ...post,
            reactions: {
              ...(post.reactions ?? {}),
              [reaction]: (post.reactions?.[reaction] ?? 0) + 1,
            },
          }
        : post);
      const patched = next.find(post => post.id === postId);
      if (patched) void withSyncWrap(async () => syncParentCirclePost(patched));
      return next;
    });
  }

  function completeTeenOracleSession(profile: OracleProfile, session: OracleSessionSummary) {
    state.setOracleProfile(profile);
    state.setOracleSessions(current => [session, ...current].slice(0, 50));
    void syncOracleDiscovery(profile, session);
  }

  function completeParentOracleSession(profile: OracleProfile, session: OracleSessionSummary) {
    state.setParentOracleProfile(profile);
    state.setParentOracleSessions(current => [session, ...current].slice(0, 50));
    void syncOracleDiscovery(profile, session);
  }

  function updateRoomMemory(patch: Partial<RoomMemory>) {
    state.setRoomMemory(current => {
      const isVisit = Boolean(patch.lastVisit) && !patch.lastHotspot && !patch.lastSummon;
      const next: RoomMemory = {
        ...current,
        ...patch,
        visitCount: isVisit ? current.visitCount + 1 : current.visitCount,
      };
      void withSyncWrap(() => syncRoomMemory(next));
      return next;
    });
  }

  function resetApp() {
    state.resetAllState();
    setJournalText('');
    setNotificationsEnabled(false);
  }

  const value: AppContextValue = {
    theme: state.theme,
    setTheme: state.setTheme,
    userSide: state.userSide,
    setUserSide: state.setUserSide,
    selectedSekret: state.selectedSekret,
    setSelectedSekret: state.setSelectedSekret,
    sekretMode: state.sekretMode,
    setSekretMode: state.setSekretMode,
    mood: state.mood,
    setMood: state.setMood,
    selectMood,
    moodHistory: state.moodHistory,
    journalText,
    setJournalText,
    entries: state.entries,
    setEntries: state.setEntries,
    saveEntry,
    patchJournalEntry,
    voiceNotes: state.voiceNotes,
    setVoiceNotes: state.setVoiceNotes,
    circlePosts: state.circlePosts,
    setCirclePosts: state.setCirclePosts,
    comfortSessions: state.comfortSessions,
    periodDays: state.periodDays,
    roomMemory: state.roomMemory,
    updateRoomMemory,
    oracleProfile: state.oracleProfile,
    setOracleProfile: state.setOracleProfile,
    oracleSessions: state.oracleSessions,
    setOracleSessions: state.setOracleSessions,
    completeTeenOracleSession,
    homeMessageIndex,
    breatheAnim,
    isLoading: state.isLoading,
    syncStatus,
    withSyncWrap,
    notificationsEnabled,
    setNotificationsEnabled,
    parentMood: state.parentMood,
    setParentMood: state.setParentMood,
    parentMoodDate: state.parentMoodDate,
    setParentMoodDate: state.setParentMoodDate,
    parentRoomStyle: state.parentRoomStyle,
    setParentRoomStyle: state.setParentRoomStyle,
    parentPagesDraft: state.parentPagesDraft,
    setParentPagesDraft: state.setParentPagesDraft,
    parentPagesEntries: state.parentPagesEntries,
    setParentPagesEntries: state.setParentPagesEntries,
    parentCirclePosts: state.parentCirclePosts,
    setParentCirclePosts: state.setParentCirclePosts,
    parentCirclePostText: state.parentCirclePostText,
    setParentCirclePostText: state.setParentCirclePostText,
    parentVoiceNotes: state.parentVoiceNotes,
    setParentVoiceNotes: state.setParentVoiceNotes,
    parentOracleProfile: state.parentOracleProfile,
    setParentOracleProfile: state.setParentOracleProfile,
    parentOracleSessions: state.parentOracleSessions,
    setParentOracleSessions: state.setParentOracleSessions,
    crewMembers: state.crewMembers,
    setCrewMembers: state.setCrewMembers,
    crewCheckIns: state.crewCheckIns,
    setCrewCheckIns: state.setCrewCheckIns,
    parentCrewMembers: state.parentCrewMembers,
    setParentCrewMembers: state.setParentCrewMembers,
    parentCrewCheckIns: state.parentCrewCheckIns,
    setParentCrewCheckIns: state.setParentCrewCheckIns,
    saveParentPageEntry,
    saveParentCirclePost,
    reactToParentPost,
    completeParentOracleSession,
    teenGender,
    resetApp,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
