/**
 * actionHandlers
 * --------------
 * Pure mutation helpers for mood, journal, circle, oracle, and crew.
 * Each function receives the current AppState setter (setState) and
 * the sync utilities, then returns or dispatches the update.
 *
 * Previously: anonymous inline functions inside AppContent.
 * Now: importable, testable, standalone functions.
 */
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../store/useAppStore';
import type {
  JournalEntry,
  CirclePost,
  ParentCirclePost,
  VoiceNote,
  MoodEntry,
  ComfortSession,
} from '@/types';
import type { OracleProfile, OracleSessionSummary } from '../../services/oracleDiscovery';
import type { SavePageInput } from '../../screens/PagesScreen';
import {
  syncMood,
  syncJournal,
  syncCirclePost,
  syncParentCirclePost,
  syncComfortSession,
} from '@/utils/sync';
import type { RoomMemory } from '../types/roomMemory';

type SetState = Dispatch<SetStateAction<AppState>>;
type SyncWrap = (fn: () => Promise<void>) => Promise<void>;

// ── Room memory ───────────────────────────────────────────────────────────
export function makeUpdateRoomMemory(setState: SetState) {
  return (patch: Partial<RoomMemory>) =>
    setState(prev => ({
      ...prev,
      roomMemory: { ...prev.roomMemory, ...patch, visitCount: prev.roomMemory.visitCount + 1 },
    }));
}

// ── Activity tracker ──────────────────────────────────────────────────────
export function makeTrackActivity(
  setState: SetState,
  withSyncWrap: SyncWrap,
  getMood: () => string
) {
  const updateRoomMemory = makeUpdateRoomMemory(setState);
  return (type: 'calm' | 'comfort' | 'voice' | 'journal' | 'growth' | 'mood') => {
    updateRoomMemory({ lastVisit: new Date().toISOString() });
    const now = new Date();
    const session: ComfortSession = {
      id:   Date.now(),
      type,
      mood: getMood(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setState(prev => ({
      ...prev,
      comfortSessions: [session, ...prev.comfortSessions].slice(0, 365),
    }));
    void withSyncWrap(async () => syncComfortSession(session));
  };
}

// ── Mood ──────────────────────────────────────────────────────────────────
export function makeSelectMood(
  setState: SetState,
  withSyncWrap: SyncWrap,
  trackActivity: ReturnType<typeof makeTrackActivity>
) {
  return (m: string) => {
    setState(prev => ({ ...prev, mood: m }));
    const entry: MoodEntry = {
      id:   Date.now(),
      mood: m,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
    setState(prev => ({ ...prev, moodHistory: [entry, ...prev.moodHistory] }));
    void withSyncWrap(async () => syncMood(entry));
    trackActivity('mood');
  };
}

// ── Journal ───────────────────────────────────────────────────────────────
export function makeSaveJournalEntry(
  setState: SetState,
  withSyncWrap: SyncWrap,
  trackActivity: ReturnType<typeof makeTrackActivity>,
  getMood: () => string,
  getJournalText: () => string
) {
  return (override?: SavePageInput & { id?: number }) => {
    const textToSave = override?.text ?? getJournalText();
    if (!textToSave.trim() && !override?.imageUri) return;
    const entry: JournalEntry = {
      id:        override?.id     ?? Date.now(),
      text:      textToSave,
      mood:      getMood(),
      source:    override?.source    ?? 'me',
      activeTab: override?.source    ?? 'me',
      moodTag:   override?.moodTag   || getMood(),
      entryMode: override?.entryMode || 'typed',
      locked:    override?.locked    || false,
      imageUri:  override?.imageUri,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setState(prev => ({ ...prev, journalEntries: [entry, ...prev.journalEntries] }));
    if (!override) setState(prev => ({ ...prev, journalText: '' }));
    void withSyncWrap(async () => syncJournal(entry));
    trackActivity('journal');
  };
}

export function makePatchJournalEntry(setState: SetState, withSyncWrap: SyncWrap) {
  return (entryId: number, reply: string) => {
    if (!reply) return;
    setState(prev => {
      const next = prev.journalEntries.map(e =>
        e.id === entryId ? { ...e, sekretReply: reply } : e
      );
      const patched = next.find(e => e.id === entryId);
      if (patched) void withSyncWrap(async () => syncJournal(patched));
      return { ...prev, journalEntries: next };
    });
  };
}

export function makeSaveParentPageEntry(setState: SetState, getMood: () => string, getParentMood: () => string) {
  return (input: SavePageInput) => {
    if (!input.text.trim() && !input.imageUri) return;
    const entry: JournalEntry = {
      id:        Date.now(),
      text:      input.text,
      mood:      getParentMood() || getMood(),
      source:    input.source,
      activeTab: input.source,
      moodTag:   input.moodTag   || getParentMood() || getMood(),
      entryMode: input.entryMode,
      locked:    input.locked,
      imageUri:  input.imageUri,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setState(prev => ({ ...prev, parentPagesEntries: [entry, ...prev.parentPagesEntries] }));
  };
}

// ── Circle ────────────────────────────────────────────────────────────────
export function makeSaveCirclePost(
  setState: SetState,
  withSyncWrap: SyncWrap,
  getCirclePostText: () => string
) {
  return (extra?: Partial<CirclePost>) => {
    const textToSave = extra?.text ?? getCirclePostText();
    if (!textToSave.trim()) return;
    const post: CirclePost = {
      id:        Number(Date.now()),
      text:      textToSave,
      date:      new Date().toLocaleDateString(),
      time:      new Date().toLocaleTimeString(),
      bipType:   extra?.bipType,
      mediaKind: extra?.mediaKind,
      circleTag: extra?.circleTag,
      postMood:  extra?.postMood,
      reactions: { felt: 0, comfort: 0, proud: 0, stay: 0, sameHere: 0 },
    };
    setState(prev => ({ ...prev, circlePosts: [post, ...prev.circlePosts] }));
    void withSyncWrap(async () => syncCirclePost(post));
  };
}

export function makeReactToPost(setState: SetState) {
  return (id: string | number, type: string) =>
    setState(prev => ({
      ...prev,
      circlePosts: prev.circlePosts.map(p =>
        String(p.id) === String(id)
          ? { ...p, reactions: { ...p.reactions, [type]: ((p.reactions as any)[type] || 0) + 1 } }
          : p
      ),
    }));
}

export function makeSaveParentCirclePost(setState: SetState, withSyncWrap: SyncWrap) {
  return () => {
    setState(prev => {
      const text = prev.parentCirclePostText;
      if (!text.trim()) return prev;
      const post: ParentCirclePost = {
        id:        Number(Date.now()),
        text,
        date:      new Date().toLocaleDateString(),
        time:      new Date().toLocaleTimeString(),
        reactions: { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 } as ParentCirclePost['reactions'],
      };
      void withSyncWrap(async () => syncParentCirclePost(post));
      return { ...prev, parentCirclePosts: [post, ...prev.parentCirclePosts], parentCirclePostText: '' };
    });
  };
}

export function makeReactToParentPost(setState: SetState) {
  return (id: string | number, type: string) =>
    setState(prev => ({
      ...prev,
      parentCirclePosts: prev.parentCirclePosts.map(p =>
        String(p.id) === String(id)
          ? ({
              ...p,
              reactions: {
                ...(p.reactions ?? {}),
                [type]: (((p.reactions as Record<string, number> | undefined)?.[type]) ?? 0) + 1,
              },
            } as ParentCirclePost)
          : p
      ),
    }));
}

// ── Oracle ────────────────────────────────────────────────────────────────
export function makeCompleteOracleSession(setState: SetState, side: 'teen' | 'parent') {
  return (profile: OracleProfile, session: OracleSessionSummary) => {
    if (side === 'teen') {
      setState(prev => ({
        ...prev,
        oracleProfile:  profile,
        oracleSessions: [session, ...prev.oracleSessions],
      }));
    } else {
      setState(prev => ({
        ...prev,
        parentOracleProfile:  profile,
        parentOracleSessions: [session, ...prev.parentOracleSessions],
      }));
    }
  };
}
