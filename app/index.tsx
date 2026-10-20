import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

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
import {
  ensureAnonymousSession, pullAll,
  syncMood, syncJournal, syncCirclePost, syncParentCirclePost,
  syncComfortSession,
} from '../utils/sync';
import type { JournalEntry, CirclePost, ParentCirclePost, VoiceNote, MoodEntry, ComfortSession, CrewMember, CrewCheckIn } from '../types/index';

// ── IMAGES ─────────────────────────────────────────────────────────────────
// One clean place to see every image Se'kret Bip uses.
//
// The actual `require()` paths + safe fallbacks live in constants/theme.ts.
// This map is re-exported here so the top of the root file documents — at a
// glance — what art is wired into the app and to which character / screen.
//
// Do NOT add new require() calls here. Edit constants/theme.ts instead so
// fallbacks stay centralized and no screen can drift out of sync.
import { IMAGES, AVATARS, getRoomBg } from '../constants/theme';
export { IMAGES, AVATARS, getRoomBg };

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
  rylane: { name: 'Rylane',             emoji: '⚡',       title: 'Loyal Bro',            vibe: 'Quiet loyalty. Keeps it real. Never talks down.', greeting: "Aight, what’s actually on your mind? No fake 'I’m fine'." },
  cloud:  { name: "Cloud Se’kret", emoji: '☁️', title: 'Quiet Observer',       vibe: 'Notices. Waits. Rarely pushes.',                  greeting: 'something feels different today.' },
  night:  { name: "Night Se’kret", emoji: '🌙', title: 'The Light Left On',     vibe: 'Presence. Not conversation.',                    greeting: 'rough night?' },
};

const HOME_MESSAGES = [
  "Don’t stay up carrying the whole world tonight.",
  'Rest is productive too.',
  'You deserve softness too.',
  'Heavy days do not define you.',
  'Your mind deserves rest.',
  'Breathe slowly tonight.',
  'You made it through today.',
];

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

export default function App() {
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
  const [oracleProfile, setOracleProfile] = useState<OracleProfile>(() => createOracleProfile('teen'));
  const [parentOracleProfile, setParentOracleProfile] = useState<OracleProfile>(() => createOracleProfile('parent'));
  const [oracleSessions, setOracleSessions] = useState<OracleSessionSummary[]>([]);
  const [parentOracleSessions, setParentOracleSessions] = useState<OracleSessionSummary[]>([]);

  // ─── Circle ────────────────────────────────────────────────────────────
  const [circlePosts, setCirclePosts]                   = useState<CirclePost[]>([]);
  const [circlePostText, setCirclePostText]             = useState('');

  // ─── Circle (Parent) — fully separated state ────────────────────────────
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

  // ── Supabase: sign in anonymously, then pull cloud state and merge it in.
  //
  // Strategy:
  //   1. Local AsyncStorage already loaded (effect above) → instant render.
  //   2. Wait until isLoading flips off so we don't fight the local restore.
  //   3. Sign in anonymously (if not configured, the whole effect no-ops).
  //   4. pullAll() reads every owned row from the cloud.
  //   5. Merge: cloud rows win on id collision; local-only rows survive
  //      (they'll sync up on next write via the fire-and-forget helpers).
  //   6. Setters update state → the existing save effect persists the
  //      merged result back to AsyncStorage for next launch.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (isLoading) return;
    let cancelled = false;

    (async () => {
      const uid = await ensureAnonymousSession();
      if (!uid || cancelled) return;

      const cloud = await pullAll();
      if (!cloud || cancelled) return;

      // Merge helper: cloud rows take precedence, then any local-only rows
      // (id not in cloud) get appended.
      const mergeById = <T extends { id: number | string },>(local: T[], remote: T[]): T[] => {
        const remoteIds = new Set(remote.map(r => r.id));
        const localExtras = local.filter(l => !remoteIds.has(l.id));
        return [...remote, ...localExtras];
      };

      setMoodHistory(prev     => mergeById(prev, cloud.moodHistory));
      setJournalEntries(prev  => mergeById(prev, cloud.journalEntries));
      setCirclePosts(prev     => mergeById(prev, cloud.circlePosts));
      setVoiceNotes(prev      => mergeById(prev, cloud.voiceNotes));
      setComfortSessions(prev => mergeById(prev, cloud.comfortSessions));
      setCrewMembers(prev     => mergeById(prev, cloud.crewMembers));
      setCrewCheckIns(prev    => mergeById(prev, cloud.crewCheckIns));

      if (__DEV__) console.log('[sync] pullAll hydrated', {
        mood: cloud.moodHistory.length,
        journal: cloud.journalEntries.length,
        circle: cloud.circlePosts.length,
        voice: cloud.voiceNotes.length,
        comfort: cloud.comfortSessions.length,
        crew: cloud.crewMembers.length,
        checkins: cloud.crewCheckIns.length,
      });
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
    journalText, journalEntries, parentPagesDraft, parentPagesEntries, moodHistory,
    journalText, journalEntries, parentPagesDraft, parentPagesEntries, oracleProfile, parentOracleProfile,
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
      setStreakDays(prev => wasYesterday ? prev + 1 : 1);
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
    syncComfortSession(session);
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
    syncMood(entry);
    trackActivity('mood');
  };

  // ── Journal ───────────────────────────────────────────────────────────────
  // override lets PagesScreen character tabs supply their own text + source tag.
  // Calling with no args reads root journalText (Me tab default).
  const saveJournalEntry = (override?: SavePageInput) => {
    const textToSave = override?.text ?? journalText;
    if (!textToSave.trim() && !override?.imageUri) return;
    const entry: JournalEntry = {
      id: Date.now(), text: textToSave, mood,
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
    syncJournal(entry);
    trackActivity('journal');
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

  // ── Oracle session completion ─────────────────────────────────────────────
  const completeTeenOracleSession = (profile: OracleProfile, session: OracleSessionSummary) => {
    setOracleProfile(profile);
    setOracleSessions(prev => [session, ...prev]);
  };

  const completeParentOracleSession = (profile: OracleProfile, session: OracleSessionSummary) => {
    setParentOracleProfile(profile);
    setParentOracleSessions(prev => [session, ...prev]);
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
    syncCirclePost(post);
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
  };

  const reactToParentPost = (id: string | number, type: string) => {
    const reactionKey = type as keyof ParentCirclePost['reactions'];
    setParentCirclePosts(posts => posts.map(p =>
      String(p.id) === String(id)
        ? { ...p, reactions: { ...p.reactions, [reactionKey]: (p.reactions[reactionKey] || 0) + 1 } }
        : p
    ));
  };

  // ── Nav ───────────────────────────────────────────────────────────────────
  const nav = <BottomNav screen={screen} setScreen={setScreen} userSide={userSide} />;

  // The branded splash is the first paint; storage hydration must never hide it.
  if (screen === 'splash') return <SplashScreen setScreen={setScreen} />;

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (isLoading) return null;

  // ━━━ RENDER SWITCH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Route map:
  //   splash · home · pages · calm · sekret · circle · bippin2 · comfort
  //   mindReset · bodyReset · bridge · parentBridge · more · settings
  //   periodCalendar · voiceBip · cloudThoughts · dashboard

  // ── Se'kret's Room (THE home — Room is the heart of Bip) ──────────────────
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
        oracleProfile={oracleProfile}
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
      companion={companion}
    />
  );

  if (screen === 'cloudThoughts') return (
    <CloudThoughtsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
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
      voiceNotes={userSide === 'parent' ? parentVoiceNotes : voiceNotes}
      setVoiceNotes={userSide === 'parent' ? setParentVoiceNotes : setVoiceNotes}
      onSave={() => trackActivity('voice')}
      mood={mood}
      companion={userSide === 'parent' ? undefined : companion}
      BottomNav={nav}
      privateProfile={userSide === 'parent' ? parentOracleProfile : oracleProfile}
      profileSide={userSide}
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
      mood={mood}
      t={t}
      setScreen={setScreen}
      BottomNav={nav}
      moodHistory={moodHistory}
      voiceNotes={voiceNotes}
      streakDays={streakDays}
      selectedSekret={selectedSekret}
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
      privateProfile={userSide === 'parent' ? parentOracleProfile : oracleProfile}
      profileSide={userSide}
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
      mood={mood}
      companion={companion}
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
    />
  );

  return null;
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
});
