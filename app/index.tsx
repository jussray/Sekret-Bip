import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Analytics } from '../components/Analytics';

// ── Screens ────────────────────────────────────────────────────────────────
// NOTE: HomeScreen is imported for the 'dashboard' route (MoreScreen → Dashboard).
// The primary 'home' route renders RoomScreen — the Room IS the home.
import { SplashScreen }         from '../screens/SplashScreen';
import { HomeScreen }           from '../screens/HomeScreen';
import { RoomScreen }           from '../screens/RoomScreen';
import { PagesScreen, type SavePageInput } from '../screens/PagesScreen';
import { ParentPagesScreen }    from '../screens/ParentPagesScreen';
import { CalmScreen }           from '../screens/CalmScreen';
import { SekretScreen }         from '../screens/SekretScreen';
import { CircleScreen }         from '../screens/CircleScreen';
import { ParentCircleScreen }   from '../screens/ParentCircleScreen';
import { Bippin2Screen }        from '../screens/Bippin2Screen';
import { GrowthScreen }         from '../screens/GrowthScreen';
import { WomanhoodScreen }      from '../screens/WomanhoodScreen';
import { ManhoodScreen }        from '../screens/ManhoodScreen';
import { HistoryScreen }        from '../screens/HistoryScreen';
import { ComfortStreaksScreen } from '../screens/ComfortStreaksScreen';
import { BipCrewScreen }        from '../screens/BipCrewScreen';
import { PointsScreen }         from '../screens/PointsScreen';
import { ComfortScreen }        from '../screens/ComfortScreen';
import { MindBodyResetScreen }  from '../screens/MindBodyResetScreen';
import { BridgeScreen }         from '../screens/BridgeScreen';
import { ParentBridgeScreen }   from '../screens/ParentBridgeScreen';
import { S2TellScreen }         from '../screens/S2TellScreen';
import { ParentRoomScreen, type ParentRoomStyle } from '../screens/ParentRoomScreen';
import { MoreScreen }           from '../screens/MoreScreen';
import { SettingsScreen }       from '../screens/SettingsScreen';
import { PeriodCalendarScreen } from '../screens/PeriodCalendarScreen';
import { VoiceBipScreen }       from '../screens/VoiceBipScreen';
import { CloudThoughtsScreen }  from '../screens/CloudThoughtsScreen';
import { THEME_PACKS, normalizeVibeKey } from '../constants/theme';
import {
  createOracleProfile,
  normalizeOracleProfile,
  normalizeOracleSessions,
  type OracleProfile,
  type OracleSessionSummary,
} from '../services/oracleDiscovery';

// ── Utils ──────────────────────────────────────────────────────────────────
// IMPORTANT: loadState() takes NO args — returns full state object.
// saveState() takes ONE object arg — all keys to update.
// Do NOT call loadState('key') or saveState('key', value).
import { loadState, saveState } from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabase';
import { useSekretCompanion } from '../hooks/useSekretCompanion';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useSleepGuard } from '../hooks/useSleepGuard';
import { SleepGate } from '../components/SleepGate';
import { AgeGate, type AgeGateStatus } from '../components/AgeGate';
import {
  ensureAnonymousSession, pullAll,
  syncMood, syncJournal, syncCirclePost, syncParentCirclePost,
  syncComfortSession, syncVoiceNote,
} from '../utils/sync';
import type { JournalEntry, CirclePost, ParentCirclePost, VoiceNote, MoodEntry, ComfortSession, CrewMember, CrewCheckIn } from '../types/index';
import type { OracleJournalEntry } from '../types/voiceIntelligence';
import { normalizeOracleJournalEntries } from '../services/voiceBipIntelligence';

// ── IMAGES ─────────────────────────────────────────────────────────────────
// Re-exported so any screen can import IMAGES/AVATARS/getRoomBg from here
// rather than reaching into constants/theme directly.
// Do NOT add new require() calls here — edit constants/theme.ts instead.
export { IMAGES, AVATARS, getRoomBg } from '../constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────
// RoomMemory: tracks room interactions for future Supabase room_memory table
export interface RoomMemory {
  character: string;
  lastVisit: string;
  lastHotspot: string;
  lastSummon: string;
  visitCount: number;
}

export const DEFAULT_ROOM_MEMORY: RoomMemory = {
  character:   'raylene',
  lastVisit:   '',
  lastHotspot: '',
  lastSummon:  '',
  visitCount:  0,
};

// ── Constants ─────────────────────────────────────────────────────────────


const SEKRET_PROFILES: Record<string, any> = {
  soft:   { name: 'Raylene',        emoji: '🌸', title: 'Favorite Older Sister', vibe: 'Funny, warm, protective, and impossible to fool.', greeting: 'friend... 😭 okay, what happened?' },
  rylane: { name: 'Rylane',             emoji: '⚡',       title: 'Loyal Bro',            vibe: 'Quiet loyalty. Keeps it real. Never talks down.', greeting: "Aight, what's actually on your mind? No fake 'I'm fine'." },
  cloud:  { name: "Cloud Se'kret", emoji: '☁️', title: 'Quiet Observer',       vibe: 'Notices. Waits. Rarely pushes.',                  greeting: 'something feels different today.' },
  night:  { name: "Night Se'kret", emoji: '🌙', title: 'The Light Left On',     vibe: 'Presence. Not conversation.',                    greeting: 'rough night?' },
};

const HOME_MESSAGES = [
  "Don't stay up carrying the whole world tonight.",
  'Rest is productive too.',
  'You deserve softness too.',
  'Heavy days do not define you.',
  'Your mind deserves rest.',
  'Breathe slowly tonight.',
  'You made it through today.',
];

// ── Active character resolver (for sticker layer) ──────────────────────────
// Maps the active sekret/theme key to a sticker-layer character identity.
// 'soft' is the legacy internal key for Raylene.
function getActiveCharacter(themeKey: string): 'raylene' | 'rylane' | 'cloud' | 'night' | null {
  if (themeKey === 'raylene' || themeKey === 'soft') return 'raylene';
  if (themeKey === 'rylane') return 'rylane';
  if (themeKey === 'cloud') return 'cloud';
  if (themeKey === 'night') return 'night';
  return null;
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────

function BottomNav({ screen, setScreen, userSide }: { screen: string; setScreen: (s: string) => void; userSide: string }) {
  const items: [string, string, string][] = userSide === 'parent'
    ? [['home','🏠','Parent Room'],['pages','📔','Pages'],['parentBridge','🌉','Bridge'],['circle','🌐','Parent Circle'],['more','☰','More']]
    : [['home','🏠','Room'],['pages','📖','Pages'],['calm','🌙','Calm'],['circle','🌐','Circle'],['more','☰','More']];

  return (
    <View style={styles.bottomNav}>
      {items.map(([id, icon, label]) => (
        <TouchableOpacity key={id} onPress={() => setScreen(id)} style={styles.navItem}>
          <Text style={styles.navIcon}>{icon}</Text>
          <Text style={[styles.navText, screen === id && styles.activeNavText]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────

function AppContent() {
  // ─── Navigation ────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('splash');

  // ─── Theme & identity ──────────────────────────────────────────────────
  const [theme, setTheme]                   = useState('raylene');
  const [selectedSekret, setSelectedSekret] = useState('soft');
  const [sekretMode, setSekretMode]         = useState('soft');
  const [userSide, setUserSide]             = useState<'teen' | 'parent'>('teen');
  const [parentRoomStyle, setParentRoomStyle] = useState<ParentRoomStyle>('mom');
  const [parentMood,      setParentMood]      = useState('');
  const [parentMoodDate,  setParentMoodDate]  = useState('');

  // ─── Mood ──────────────────────────────────────────────────────────────
  const [mood, setMood]             = useState('Happy');
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  // ─── Journal (route: 'pages') ──────────────────────────────────────────
  // RENAMED: entries → journalEntries, saveEntry → saveJournalEntry
  // to match fixed JournalScreen prop interface
  const [journalText, setJournalText]       = useState('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  // Parent Pages are intentionally isolated from teen entries and cloud journal sync.
  const [parentPagesDraft, setParentPagesDraft] = useState('');
  const [parentPagesEntries, setParentPagesEntries] = useState<JournalEntry[]>([]);
  const [oracleJournalEntries, setOracleJournalEntries] = useState<OracleJournalEntry[]>([]);
  const [oracleProfile, setOracleProfile] = useState<OracleProfile>(() => createOracleProfile('teen'));
  const [parentOracleProfile, setParentOracleProfile] = useState<OracleProfile>(() => createOracleProfile('parent'));
  const [oracleSessions, setOracleSessions] = useState<OracleSessionSummary[]>([]);
  const [parentOracleSessions, setParentOracleSessions] = useState<OracleSessionSummary[]>([]);

  // ─── Circle ────────────────────────────────────────────────────────────
  const [circlePosts, setCirclePosts]                   = useState<CirclePost[]>([]);
  const [circlePostText, setCirclePostText]             = useState('');
  const [parentCirclePosts, setParentCirclePosts]       = useState<ParentCirclePost[]>([]);
  const [parentCirclePostText, setParentCirclePostText] = useState('');

  // ─── Voice Bip ─────────────────────────────────────────────────────────
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [parentVoiceNotes, setParentVoiceNotes] = useState<VoiceNote[]>([]);

  // ─── Comfort sessions (calm + comfort rituals) ─────────────────────────
  const [comfortSessions, setComfortSessions] = useState<ComfortSession[]>([]);

  // ─── Bip Crew (invite-only accountability) ──────────────────────────
  const [crewMembers,  setCrewMembers]  = useState<CrewMember[]>([]);
  const [crewCheckIns, setCrewCheckIns] = useState<CrewCheckIn[]>([]);

  // ─── Streak tracking ───────────────────────────────────────────────────
  const [streakDays, setStreakDays]     = useState(0);
  const [lastOpenDate, setLastOpenDate] = useState('');
  const [streakJustReset, setStreakJustReset] = useState(false);

  // ─── Room Memory (Supabase-ready) ──────────────────────────────────────
  const [roomMemory, setRoomMemory] = useState<RoomMemory>(DEFAULT_ROOM_MEMORY);

  // ─── UI ────────────────────────────────────────────────────────────────
  const [homeMessageIndex, setHomeMessageIndex] = useState(0);
  const [isLoading, setIsLoading]               = useState(true);

  // ── Derived ──────────────────────────────────────────────────────────────
  const vibeKey       = normalizeVibeKey(theme);
  const t             = THEME_PACKS[vibeKey];
  const currentSekret = SEKRET_PROFILES[selectedSekret] || SEKRET_PROFILES.soft;
  const companionInput = useMemo(() => ({
    selectedSekret,
    mood,
    journalEntries,
    moodHistory,
    voiceNotes,
    comfortSessions,
    circlePosts,
    streakDays,
    lastOpenDate,
    screen,
    isLateNight: new Date().getHours() >= 22 || new Date().getHours() < 5,
  }), [selectedSekret, mood, journalEntries, moodHistory, voiceNotes, comfortSessions, circlePosts, streakDays, lastOpenDate, screen]);
  const companion = useSekretCompanion(companionInput);
  const { syncStatus, withSyncWrap } = useSyncStatus();
  const { sleepActive, sleepWindow, setSleepWindow } = useSleepGuard();

  // ── AsyncStorage: load on mount ───────────────────────────────────────────
  // loadState() returns the full state object — no args needed.
  // Keys returned match STORAGE_KEYS in utils/storage.ts:
  //   theme, mood, userSide, selectedSekret, sekretMode, journalText,
  //   entries (journalEntries), moodHistory, circlePosts, voiceNotes,
  //   streakDays, lastOpenDate  (streakDays/lastOpenDate are custom — added below)
  // NOTE: storage.ts auto-parses arrays: entries, moodHistory, circlePosts, voiceNotes
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
        // 'entries' is the storage key (matches STORAGE_KEYS in storage.ts)
        // but we keep it as journalEntries in state
        if (state.entries)        setJournalEntries(Array.isArray(state.entries) ? state.entries : []);
        if (state.parentPagesDraft) setParentPagesDraft(state.parentPagesDraft);
        if (state.parentPagesEntries) setParentPagesEntries(Array.isArray(state.parentPagesEntries) ? state.parentPagesEntries : []);
        if (state.oracleJournalEntries) setOracleJournalEntries(normalizeOracleJournalEntries(state.oracleJournalEntries, 'teen'));
        if (state.oracleProfile) setOracleProfile(normalizeOracleProfile(state.oracleProfile, 'teen'));
        if (state.parentOracleProfile) setParentOracleProfile(normalizeOracleProfile(state.parentOracleProfile, 'parent'));
        if (state.oracleSessions) setOracleSessions(normalizeOracleSessions(state.oracleSessions, 'teen'));
        if (state.parentOracleSessions) setParentOracleSessions(normalizeOracleSessions(state.parentOracleSessions, 'parent'));
        if (state.moodHistory)    setMoodHistory(Array.isArray(state.moodHistory) ? state.moodHistory : []);
        if (state.circlePosts)       setCirclePosts(Array.isArray(state.circlePosts) ? state.circlePosts : []);
        if (state.parentCirclePosts) setParentCirclePosts(Array.isArray(state.parentCirclePosts) ? state.parentCirclePosts : []);
        if (state.voiceNotes)     setVoiceNotes(Array.isArray(state.voiceNotes) ? state.voiceNotes : []);
        if (state.parentVoiceNotes) setParentVoiceNotes(Array.isArray(state.parentVoiceNotes) ? state.parentVoiceNotes : []);
        if (state.comfortSessions) setComfortSessions(Array.isArray(state.comfortSessions) ? state.comfortSessions : []);
        if (state.crewMembers)     setCrewMembers(Array.isArray(state.crewMembers) ? state.crewMembers : []);
        if (state.crewCheckIns)    setCrewCheckIns(Array.isArray(state.crewCheckIns) ? state.crewCheckIns : []);
        // streakDays / lastOpenDate / roomMemory not in STORAGE_KEYS yet —
        // stored as custom keys via saveState; loaded as plain strings here
        if (state.streakDays)     setStreakDays(Number(state.streakDays) || 0);
        if (state.lastOpenDate)   setLastOpenDate(state.lastOpenDate);
        if (state.roomMemory) {
          const rm = typeof state.roomMemory === 'string'
            ? JSON.parse(state.roomMemory)
            : state.roomMemory;
          setRoomMemory(rm);
        }
        if (state.parentRoomStyle === 'mom' || state.parentRoomStyle === 'dad') {
          setParentRoomStyle(state.parentRoomStyle as ParentRoomStyle);
        }
        if (state.parentMood)     setParentMood(state.parentMood);
        if (state.parentMoodDate) setParentMoodDate(state.parentMoodDate);
      } catch {
        // Storage read failure — continue with defaults
      }
      setIsLoading(false);
    })();
  }, []);

  // ── userSide change → show splash then snap to the correct home screen ────
  // Route 'home' is shared by both sides:
  //   userSide === 'parent' → renders ParentRoomScreen  (Parent Room)
  //   userSide === 'teen'   → renders RoomScreen        (teen Room)
  // On switch, briefly show SplashScreen (which selects parent-space-splash.png
  // when userSide === 'parent') before landing on the new side's home.
  // Guard: skip on initial mount (isLoading still true) so the splash sequence
  // is not interrupted by a stored userSide value being hydrated.
  useEffect(() => {
    if (isLoading) return;
    setScreen('splash');
    const timer = setTimeout(() => setScreen('home'), 1200);
    return () => clearTimeout(timer);
  }, [userSide]);

  // ── Supabase: sign in anonymously, then pull cloud state and merge it in.
  //
  // Safety guarantees:
  //   1. AsyncStorage loads first (effect above flips isLoading → false).
  //      This effect is gated on !isLoading, so local state is always
  //      populated before any cloud data arrives.
  //   2. If Supabase is not configured, the effect returns immediately —
  //      no network call, no crash.
  //   3. If ensureAnonymousSession() fails (no network, wrong env vars),
  //      uid is null and the effect returns — local state is untouched.
  //   4. If pullAll() returns null (network error, Supabase down), the
  //      effect returns — local state is untouched.
  //   5. mergeById: cloud rows win on id collision; local-only rows
  //      (not yet synced) are appended — nothing is lost.
  //   6. roomMemory: object-spread merge so only present cloud fields
  //      overwrite local fields; visitCount is NOT reset.
  //   7. cancelled flag prevents stale state updates if the component
  //      unmounts before the async chain resolves.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (isLoading) return;
    let cancelled = false;

    (async () => {
      const uid = await ensureAnonymousSession();
      if (!uid || cancelled) return;

      // Snapshot local counts before pull (DEV only)
      // These are captured in the closure at the moment the effect fires,
      // i.e. after AsyncStorage has already loaded.
      if (__DEV__) {
        // Access current state via refs would be cleaner, but capturing
        // at effect-fire time is sufficient for diagnostic purposes.
        console.log('[sync] local state before pullAll — counts are approximate (closure snapshot)');
      }

      const cloud = await pullAll();
      if (!cloud || cancelled) return;

      if (__DEV__) console.log('[sync] pullAll hydrated', {
        moodHistory:      cloud.moodHistory.length,
        journalEntries:   cloud.journalEntries.length,
        circlePosts:      cloud.circlePosts.length,
        parentCirclePosts: cloud.parentCirclePosts.length,
        voiceNotes:       cloud.voiceNotes.length,
        comfortSessions:  cloud.comfortSessions.length,
        crewMembers:      cloud.crewMembers.length,
        crewCheckIns:     cloud.crewCheckIns.length,
        roomMemory:       cloud.roomMemory ? 'present' : 'null (first install)',
      });

      // Merge helper: cloud rows take precedence on id collision;
      // local-only rows (id not in cloud set) are appended so nothing is lost.
      // Only runs if cloud returned a non-empty array — empty cloud arrays
      // never overwrite non-empty local arrays (the local-only rows are kept).
      const mergeById = <T extends { id: number | string },>(local: T[], remote: T[]): T[] => {
        const remoteIds = new Set(remote.map(r => r.id));
        const localExtras = local.filter(l => !remoteIds.has(l.id));
        return [...remote, ...localExtras];
      };

      setMoodHistory(prev     => {
        const merged = mergeById(prev, cloud.moodHistory);
        if (__DEV__) console.log('[sync] moodHistory     local', prev.length, '→ cloud', cloud.moodHistory.length, '→ merged', merged.length);
        return merged;
      });
      setJournalEntries(prev  => {
        const merged = mergeById(prev, cloud.journalEntries);
        if (__DEV__) console.log('[sync] journalEntries  local', prev.length, '→ cloud', cloud.journalEntries.length, '→ merged', merged.length);
        return merged;
      });
      setCirclePosts(prev     => {
        const merged = mergeById(prev, cloud.circlePosts);
        if (__DEV__) console.log('[sync] circlePosts     local', prev.length, '→ cloud', cloud.circlePosts.length, '→ merged', merged.length);
        return merged;
      });
      // Wire new field: parentCirclePosts
      setParentCirclePosts(prev => {
        const merged = mergeById(prev, cloud.parentCirclePosts);
        if (__DEV__) console.log('[sync] parentCircle    local', prev.length, '→ cloud', cloud.parentCirclePosts.length, '→ merged', merged.length);
        return merged;
      });
      setVoiceNotes(prev      => {
        const merged = mergeById(prev, cloud.voiceNotes);
        if (__DEV__) console.log('[sync] voiceNotes      local', prev.length, '→ cloud', cloud.voiceNotes.length, '→ merged', merged.length);
        return merged;
      });
      setComfortSessions(prev => {
        const merged = mergeById(prev, cloud.comfortSessions);
        if (__DEV__) console.log('[sync] comfortSessions local', prev.length, '→ cloud', cloud.comfortSessions.length, '→ merged', merged.length);
        return merged;
      });
      setCrewMembers(prev     => {
        const merged = mergeById(prev, cloud.crewMembers);
        if (__DEV__) console.log('[sync] crewMembers     local', prev.length, '→ cloud', cloud.crewMembers.length, '→ merged', merged.length);
        return merged;
      });
      setCrewCheckIns(prev    => {
        const merged = mergeById(prev, cloud.crewCheckIns);
        if (__DEV__) console.log('[sync] crewCheckIns    local', prev.length, '→ cloud', cloud.crewCheckIns.length, '→ merged', merged.length);
        return merged;
      });
      // Wire new field: roomMemory
      // Object-spread merge: cloud fields overwrite matching local fields;
      // visitCount is preserved from local (not reset by cloud).
      if (cloud.roomMemory) {
        setRoomMemory(prev => {
          const merged = { ...prev, ...cloud.roomMemory! };
          if (__DEV__) console.log('[sync] roomMemory merged', merged);
          return merged;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [isLoading]);

  // ── AsyncStorage: save on change ──────────────────────────────────────────
  // saveState() takes a single object — all key/value pairs to persist.
  // Arrays must be passed as-is (storage.ts handles JSON.stringify internally
  // for non-string values via the multiSet pairs mapping).
  // Note: storage.ts STORAGE_KEYS uses 'entries' not 'journalEntries'
  useEffect(() => {
    if (isLoading) return;
    saveState({
      theme,
      mood,
      userSide,
      selectedSekret,
      sekretMode,
      journalText,
      entries:       journalEntries,   // storage key is 'entries'
      oracleJournalEntries,
      parentPagesDraft,
      parentPagesEntries,
      oracleProfile,
      parentOracleProfile,
      oracleSessions,
      parentOracleSessions,
      moodHistory,
      circlePosts,
      parentCirclePosts,
      voiceNotes,
      parentVoiceNotes,
      comfortSessions,
      crewMembers,
      crewCheckIns,
      streakDays:       String(streakDays),
      lastOpenDate,
      roomMemory:       JSON.stringify(roomMemory),
      parentRoomStyle,
      parentMood,
      parentMoodDate,
    }).catch(() => {});
  }, [
    theme, mood, userSide, selectedSekret, sekretMode,
    journalText, journalEntries, oracleJournalEntries, parentPagesDraft, parentPagesEntries, oracleProfile, parentOracleProfile,
    oracleSessions, parentOracleSessions, moodHistory,
    circlePosts, parentCirclePosts, voiceNotes, parentVoiceNotes, comfortSessions,
    crewMembers, crewCheckIns, streakDays, lastOpenDate,
    roomMemory, parentRoomStyle, parentMood, parentMoodDate, isLoading,
  ]);

  // ── Streak tracking (daily open) ──────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    const today = new Date().toLocaleDateString();
    if (lastOpenDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = lastOpenDate === yesterday.toLocaleDateString();
      setStreakDays(prev => {
        if (wasYesterday) return prev + 1;
        // Missed a day or more — soften the reset, never shame it.
        setStreakJustReset(prev > 1);
        return 1;
      });
      setLastOpenDate(today);
    }
  }, [isLoading, lastOpenDate]);

  // ── Rotating home message ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(
      () => setHomeMessageIndex(p => (p + 1) % HOME_MESSAGES.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  // ── Room Memory updater (Supabase-ready) ──────────────────────────────────
  const updateRoomMemory = (patch: Partial<RoomMemory>) => {
    setRoomMemory(prev => ({ ...prev, ...patch, visitCount: prev.visitCount + 1 }));
  };

  // ── Activity tracker (RoomMemory + future Supabase hooks) ─────────────────
  const trackActivity = (type: 'calm' | 'comfort' | 'voice' | 'journal' | 'growth' | 'mood') => {
    updateRoomMemory({ lastVisit: new Date().toISOString() });
    const now = new Date();
    const nextId = Date.now();
    const session: ComfortSession = {
      id:   nextId,
      type,
      mood,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setComfortSessions(prev => [session, ...prev].slice(0, 365));
    void withSyncWrap(async () => syncComfortSession(session));
  };

  // ── Mood ──────────────────────────────────────────────────────────────────
  const selectMood = (m: string) => {
    setMood(m);
    const entry: MoodEntry = {
      id: Date.now(), mood: m,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    setMoodHistory(h => [entry, ...h]);
    void withSyncWrap(async () => syncMood(entry));
    trackActivity('mood');
  };

  // ── Journal ───────────────────────────────────────────────────────────────
  // override lets PagesScreen character tabs supply their own text + source tag.
  // Calling with no args reads root journalText (Me tab default).
  // override.id: when PagesWorkspace pre-mints an id (for sekretReply correlation),
  // honour it so patchJournalEntry can find the entry by the same id.
  const saveJournalEntry = (override?: SavePageInput & { id?: number }) => {
    const textToSave = override?.text ?? journalText;
    if (!textToSave.trim() && !override?.imageUri) return;
    const entry: JournalEntry = {
      id: override?.id ?? Date.now(), text: textToSave, mood,
      source: override?.source ?? 'me',
      activeTab: override?.source ?? 'me',
      moodTag: override?.moodTag || mood,
      entryMode: override?.entryMode || 'typed',
      locked: override?.locked || false,
      imageUri: override?.imageUri,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setJournalEntries(e => [entry, ...e]);
    if (!override) setJournalText('');
    void withSyncWrap(async () => syncJournal(entry));
    trackActivity('journal');
  };

  /**
   * patchJournalEntry — called by PagesScreen once the avatar Worker reply
   * arrives. Finds the matching entry by id, attaches sekretReply, and
   * re-persists via syncJournal so the reply survives navigation and restarts.
   */
  const patchJournalEntry = (entryId: number, reply: string) => {
    if (!reply) return;
    setJournalEntries(prev => {
      const next = prev.map(entry =>
        entry.id === entryId ? { ...entry, sekretReply: reply } : entry
      );
      const patched = next.find(entry => entry.id === entryId);
      if (patched) void withSyncWrap(async () => syncJournal(patched));
      return next;
    });
  };

  const saveParentPageEntry = (input: SavePageInput) => {
    if (!input.text.trim() && !input.imageUri) return;
    const entry: JournalEntry = {
      id: Date.now(),
      text: input.text,
      mood: parentMood || mood,
      source: input.source,
      activeTab: input.source,
      moodTag: input.moodTag || parentMood || mood,
      entryMode: input.entryMode,
      locked: input.locked,
      imageUri: input.imageUri,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    // Parent reflection remains device-local and never joins teen journal sync.
    setParentPagesEntries(current => [entry, ...current]);
  };

  // ── Circle (Teen) ────────────────────────────────────────────────────────
  const saveCirclePost = (extra?: Partial<CirclePost>) => {
    const textToSave = extra?.text ?? circlePostText;
    if (!textToSave.trim()) return;
    const post: CirclePost = {
      id: Number(Date.now()),
      text: textToSave,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      bipType:   extra?.bipType,
      mediaKind: extra?.mediaKind,
      circleTag: extra?.circleTag,
      postMood:  extra?.postMood,
      reactions: { felt: 0, comfort: 0, proud: 0, stay: 0, sameHere: 0 },
    };
    setCirclePosts(p => [post, ...p]);
    void withSyncWrap(async () => syncCirclePost(post));
  };

  const reactToPost = (id: string | number, type: string) => {
    setCirclePosts(posts => posts.map(p =>
      String(p.id) === String(id)
        ? { ...p, reactions: { ...p.reactions, [type]: ((p.reactions as any)[type] || 0) + 1 } }
        : p
    ));
  };

  const saveParentCirclePost = () => {
    if (!parentCirclePostText.trim()) return;
    const post: ParentCirclePost = {
      id: Number(Date.now()), text: parentCirclePostText,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      reactions: { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 },
    };
    setParentCirclePosts(p => [post, ...p]);
    setParentCirclePostText('');
    void withSyncWrap(async () => syncParentCirclePost(post));
  };

  const reactToParentPost = (id: string | number, type: string) => {
    const reactionKey = type as keyof ParentCirclePost['reactions'];
    setParentCirclePosts(posts => posts.map(p =>
      String(p.id) === String(id)
        ? { ...p, reactions: { ...p.reactions, [reactionKey]: (p.reactions[reactionKey] || 0) + 1 } }
        : p
    ));
  };

  // ── Oracle session completion ─────────────────────────────────────────────
  const completeTeenOracleSession = (profile: OracleProfile, session: OracleSessionSummary) => {
    setOracleProfile(profile);
    setOracleSessions(prev => [session, ...prev]);
  };

  const completeParentOracleSession = (profile: OracleProfile, session: OracleSessionSummary) => {
    setParentOracleProfile(profile);
    setParentOracleSessions(prev => [session, ...prev]);
  };

  // ── Nav ───────────────────────────────────────────────────────────────────
  const nav = <BottomNav screen={screen} setScreen={setScreen} userSide={userSide} />;

  // The branded splash is the first paint; storage hydration must never hide it.
  if (screen === 'splash') return <SplashScreen setScreen={setScreen} userSide={userSide} />;

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (isLoading) return (
    <View style={styles.loadingRoot}>
      <ActivityIndicator color="#c4b5fd" />
      <Text style={styles.loadingText}>just a sec… 💜</Text>
    </View>
  );

  // Sleep guardrail: block normal wandering during the configured sleep
  // window, but Comfort (and its sub-screens) always stays reachable.
  const allowComfort = ['comfort', 'calm', 'mindReset', 'bodyReset'].includes(screen);

  const renderRoute = (): React.ReactNode => {
  // ━━━ RENDER SWITCH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Route map:
  //   splash · home · pages · calm · sekret · circle · bippin2 · comfort
  //   mindReset · bodyReset · bridge · parentBridge · more · settings
  //   periodCalendar · voiceBip · cloudThoughts · dashboard

  // ── Se'kret's Room (THE home — Room is the heart of Bip) ──────────────────
  // 'home' is the shared route key for both sides:
  //   parent → ParentRoomScreen   (Parent Room opens by default on parent mode)
  //   teen   → RoomScreen         (normal teen Room)
  if (screen === 'home') {
    if (userSide === 'parent') {
      const today = new Date().toLocaleDateString();
      const previousMood = (parentMoodDate && parentMoodDate !== today) ? parentMood : '';
      return (
        <ParentRoomScreen
          parentRoomStyle={parentRoomStyle}
          parentMood={parentMood}
          previousMood={previousMood}
          setParentMood={(m) => {
            setParentMood(m);
            setParentMoodDate(new Date().toLocaleDateString());
          }}
          setScreen={setScreen}
          weatherMode={theme === 'rain' ? 'rain' : undefined}
          BottomNav={nav}
        />
      );
    }
    return (
      <RoomScreen
        mood={mood}
        selectedSekret={selectedSekret}
        setSelectedSekret={val => setSelectedSekret(val)}
        setScreen={setScreen}
        t={t}
        updateRoomMemory={updateRoomMemory}
        vibe={vibeKey}
        companion={companion}
        sekretMode={selectedSekret}
        BottomNav={nav}
      />
    );
  }

  // ── Dashboard (HomeScreen) — secondary entry, available from MoreScreen ───
  if (screen === 'dashboard') return (
    <HomeScreen
      mood={mood}
      selectMood={selectMood}
      t={t}
      currentSekret={currentSekret}
      selectedSekret={selectedSekret}
      homeMessageIndex={homeMessageIndex}
      userSide={userSide}
      setScreen={setScreen}
      onMoodSelect={(m) => trackActivity('mood')}
      BottomNav={nav}
      streakDays={streakDays}
      streakJustReset={streakJustReset}
      companion={companion}
      syncStatus={syncStatus}
    />
  );

  if (screen === 'cloudThoughts') return (
    <CloudThoughtsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      character={getActiveCharacter(selectedSekret)}
      setScreen={setScreen}
      BottomNav={nav}
      privateProfile={userSide === 'parent' ? parentOracleProfile : oracleProfile}
      profileSide={userSide}
    />
  );

  if (screen === 'periodCalendar') return (
    <PeriodCalendarScreen theme={t} setScreen={setScreen} BottomNav={nav} selectedSekret={selectedSekret} mood={mood} />
  );

  if (screen === 'voiceBip') return (
    <VoiceBipScreen
      theme={t}
      setScreen={setScreen}
      selectedSekret={selectedSekret}
      onSelectAvatar={avatarKey => setSelectedSekret(avatarKey)}
      weatherMode={theme === 'rain' ? 'rain' : undefined}
      voiceNotes={userSide === 'parent' ? parentVoiceNotes : voiceNotes}
      setVoiceNotes={userSide === 'parent' ? setParentVoiceNotes : setVoiceNotes}
      onSave={(note: VoiceNote) => {
        // Parent voice notes stay device-local, same privacy boundary as Parent Pages.
        if (userSide === 'teen') void withSyncWrap(async () => syncVoiceNote(note));
        trackActivity('voice');
      }}
      mood={mood}
      companion={userSide === 'parent' ? undefined : companion}
      BottomNav={nav}
      privateProfile={userSide === 'parent' ? parentOracleProfile : oracleProfile}
      profileSide={userSide}
      syncStatus={userSide === 'teen' ? syncStatus : undefined}
      oracleJournalEntries={userSide === 'teen' ? oracleJournalEntries : []}
      onStoreOracleMemory={(entry: OracleJournalEntry) => {
        if (userSide === 'teen') setOracleJournalEntries(current => [entry, ...current].slice(0, 250));
      }}
    />
  );

  if (screen === 'pages') return userSide === 'parent' ? (
    <ParentPagesScreen
      entries={parentPagesEntries}
      draft={parentPagesDraft}
      setDraft={setParentPagesDraft}
      onSave={saveParentPageEntry}
      mood={parentMood || mood}
      setScreen={setScreen}
      BottomNav={nav}
      parentRoomStyle={parentRoomStyle}
      weatherMode={theme === 'rain' ? 'rain' : undefined}
      oracleProfile={parentOracleProfile}
      onCompleteOracleSession={completeParentOracleSession}
    />
  ) : (
    <PagesScreen
      journalText={journalText}
      setJournalText={setJournalText}
      journalEntries={journalEntries}
      saveJournalEntry={saveJournalEntry}
      oracleProfile={oracleProfile}
      onCompleteOracleSession={completeTeenOracleSession}
      onSekretReply={patchJournalEntry}
      mood={mood}
      t={t}
      setScreen={setScreen}
      BottomNav={nav}
      moodHistory={moodHistory}
      voiceNotes={voiceNotes}
      streakDays={streakDays}
      selectedSekret={selectedSekret}
      syncStatus={syncStatus}
    />
  );

  if (screen === 'calm') return (
    <CalmScreen
      t={t}
      mood={mood}
      setMood={setMood}
      setScreen={setScreen}
      BottomNav={nav}
      selectedSekret={selectedSekret}
    />
  );

  if (screen === 'sekret') return (
    <SekretScreen
      t={t}
      mood={mood}
      currentSekret={currentSekret}
      selectedProfile={selectedSekret}
      setSelectedProfile={setSelectedSekret}
      userSide={userSide}
      setScreen={setScreen}
      BottomNav={nav}
      privateProfile={userSide === 'parent' ? parentOracleProfile : oracleProfile}
    />
  );

  if (screen === 'circle') {
    if (userSide === 'parent') return (
      <ParentCircleScreen
        parentCirclePosts={parentCirclePosts}
        parentCirclePostText={parentCirclePostText}
        setParentCirclePostText={setParentCirclePostText}
        saveParentCirclePost={saveParentCirclePost}
        reactToParentPost={reactToParentPost}
        setScreen={setScreen}
        BottomNav={nav}
      />
    );
    return (
      <CircleScreen
        t={t}
        circlePosts={circlePosts}
        circlePostText={circlePostText}
        setCirclePostText={setCirclePostText}
        saveCirclePost={saveCirclePost}
        reactToPost={reactToPost}
        setScreen={setScreen}
        BottomNav={nav}
        selectedSekret={selectedSekret}
        mood={mood}
        syncStatus={syncStatus}
      />
    );
  }

  if (screen === 'bridge') return (
    <BridgeScreen t={t} currentSekret={currentSekret} setScreen={setScreen} BottomNav={nav} selectedSekret={selectedSekret} mood={mood} />
  );

  if (screen === 's2tell') return (
    <S2TellScreen
      t={t}
      setScreen={setScreen}
      BottomNav={nav}
      selectedSekret={selectedSekret}
      mood={mood}
      privateProfile={oracleProfile}
    />
  );

  if (screen === 'parentBridge') return (
    <ParentBridgeScreen t={t} setScreen={setScreen} BottomNav={nav} />
  );

  if (screen === 'bippin2') return (
    <Bippin2Screen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={setScreen}
      onMilestone={() => trackActivity('growth')}
      streakDays={streakDays}
      BottomNav={nav}
    />
  );

  if (screen === 'growth') return (
    <GrowthScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={setScreen}
      onMilestone={() => trackActivity('growth')}
      streakDays={streakDays}
      BottomNav={nav}
    />
  );

  if (screen === 'womanhood') return (
    <WomanhoodScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={setScreen}
      BottomNav={nav}
      streakDays={streakDays}
    />
  );

  if (screen === 'manhood') return (
    <ManhoodScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={setScreen}
      BottomNav={nav}
      streakDays={streakDays}
    />
  );

  if (screen === 'comfort') return (
    <ComfortScreen
      t={t}
      setScreen={setScreen}
      onComplete={() => trackActivity('comfort')}
      BottomNav={nav}
      selectedSekret={selectedSekret}
      character={getActiveCharacter(selectedSekret)}
      mood={mood}
      companion={companion}
      syncStatus={syncStatus}
    />
  );

  if (screen === 'mindReset' || screen === 'bodyReset') return (
    <MindBodyResetScreen
      screen={screen as 'mindReset' | 'bodyReset'}
      t={t}
      selectedSekret={selectedSekret}
      setScreen={setScreen}
      onComplete={() => trackActivity('calm')}
      BottomNav={nav}
      mood={mood}
    />
  );

  if (screen === 'points') return (
    <PointsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      moodHistory={moodHistory}
      journalEntries={journalEntries}
      voiceNotes={voiceNotes}
      circlePosts={circlePosts}
      comfortSessions={comfortSessions}
      crewCheckIns={crewCheckIns}
      streakDays={streakDays}
      setScreen={setScreen}
      BottomNav={nav}
    />
  );

  if (screen === 'crew') return (
    <BipCrewScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      crewMembers={crewMembers}
      setCrewMembers={setCrewMembers}
      crewCheckIns={crewCheckIns}
      setCrewCheckIns={setCrewCheckIns}
      setScreen={setScreen}
      BottomNav={nav}
      syncStatus={syncStatus}
      withSyncWrap={withSyncWrap}
    />
  );

  if (screen === 'comfortStreaks') return (
    <ComfortStreaksScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      comfortSessions={comfortSessions}
      setScreen={setScreen}
      BottomNav={nav}
    />
  );

  if (screen === 'history') return (
    <HistoryScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      moodHistory={moodHistory}
      journalEntries={journalEntries}
      voiceNotes={voiceNotes}
      circlePosts={circlePosts}
      streakDays={streakDays}
      setScreen={setScreen}
      BottomNav={nav}
    />
  );

  if (screen === 'more') return (
    <MoreScreen
      t={t}
      userSide={userSide}
      setUserSide={(side: string) => setUserSide(side as 'teen' | 'parent')}
      onSideChanged={() => setScreen('splash')}
      setScreen={setScreen}
      BottomNav={nav}
      mood={mood}
      selectedSekret={selectedSekret}
    />
  );

  if (screen === 'settings') return (
    <SettingsScreen
      t={t}
      theme={theme}
      setTheme={setTheme}
      selectedSekret={selectedSekret}
      setSelectedSekret={setSelectedSekret}
      sekretMode={sekretMode}
      setSekretMode={setSekretMode}
      userSide={userSide}
      setUserSide={(side: string) => setUserSide(side as 'teen' | 'parent')}
      parentRoomStyle={parentRoomStyle}
      setParentRoomStyle={(s) => setParentRoomStyle(s as ParentRoomStyle)}
      setScreen={setScreen}
      BottomNav={nav}
      mood={mood}
      sleepWindow={sleepWindow}
      setSleepWindow={setSleepWindow}
    />
  );

  return null;
  };

  return (
    <AgeGate onResolved={(next: AgeGateStatus) => { if (next === 'guardian') setUserSide('parent'); }}>
      <SleepGate sleepActive={sleepActive} allowComfort={allowComfort} onComfort={() => setScreen('comfort')}>
        {renderRoute()}
      </SleepGate>
    </AgeGate>
  );
}

// ── App Wrapper with Analytics ─────────────────────────────────────────────
// Wrap the app with Vercel Analytics (web-only)
export default function App() {
  return (
    <>
      <AppContent />
      {Platform.OS === 'web' && <Analytics />}
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bottomNav:     {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 14, backgroundColor: '#111827',
    borderRadius: 20, marginTop: 20, marginBottom: 16,
    flexWrap: 'wrap', gap: 8,
    ...(Platform.OS === 'web' ? { maxWidth: 500, width: '100%', alignSelf: 'center' as const } : {}),
  },
  navItem:       { alignItems: 'center', minWidth: 52 },
  navIcon:       { fontSize: 20, marginBottom: 3 },
  navText:       { color: '#94A3B8', fontSize: 11 },
  activeNavText: { color: '#fff', fontWeight: 'bold' },
  loadingRoot:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080611' },
  loadingText:   { color: '#b9afc5', fontSize: 13, marginTop: 14, textAlign: 'center' },
});
