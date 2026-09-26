/**
 * useAppEffects
 * -------------
 * Houses every useEffect that previously lived in AppContent:
 *   1. Load persisted state from AsyncStorage on mount
 *   2. userSide change → splash gate (CTA-only advance — no auto-timer)
 *   3. Authenticated Supabase cloud pull & merge
 *   4. Save state to AsyncStorage on change
 *   5. Streak tracking
 *   6. Rotating home message
 */
import { useEffect } from 'react';
import { AppState as NativeAppState } from 'react-native';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../store/useAppStore';
import { loadState, saveState } from '@/utils/storage';
import { isSupabaseConfigured } from '@/utils/supabase';
import {
  pullAll,
  loadPeriodDays,
  initTeenActivitySync,
} from '@/utils/sync';
import { getCurrentSessionUserId } from '@/services/session';
import { emitEvent } from '@/features/activity/events';
import { initPointLedger } from '@/features/activity/ledger';
import { mergeById } from '../utils/mergeById';
import { normalizeVibeKey } from '../../constants/theme';
import {
  normalizeOracleProfile,
  normalizeOracleSessions,
  restoreOracleDiscovery,
} from '../../services/oracleDiscovery';
import { normalizeOracleJournalEntries } from '../../services/voiceBipIntelligence';
import { HOME_MESSAGES } from '../constants/homeMessages';

type SetState = Dispatch<SetStateAction<AppState>>;

export function useAppEffects(state: AppState, setState: SetState) {
  const { isLoading, userSide, lastOpenDate } = state;

  // 1. Load persisted state on mount
  useEffect(() => {
    (async () => {
      try {
        const s = await loadState();
        setState(prev => ({
          ...prev,
          theme:           s.theme ? normalizeVibeKey(s.theme) : prev.theme,
          mood:            s.mood            ?? prev.mood,
          userSide:        s.userSide        ?? prev.userSide,
          selectedSekret:  s.selectedSekret  ?? prev.selectedSekret,
          sekretMode:      s.sekretMode      ?? prev.sekretMode,
          journalText:     s.journalText      ?? prev.journalText,
          journalEntries:  Array.isArray(s.entries)              ? s.entries              : prev.journalEntries,
          parentPagesDraft:   s.parentPagesDraft   ?? prev.parentPagesDraft,
          parentPagesEntries: Array.isArray(s.parentPagesEntries) ? s.parentPagesEntries : prev.parentPagesEntries,
          oracleJournalEntries: s.oracleJournalEntries
            ? normalizeOracleJournalEntries(s.oracleJournalEntries, 'teen')
            : prev.oracleJournalEntries,
          oracleProfile:         s.oracleProfile       ? normalizeOracleProfile(s.oracleProfile, 'teen')     : prev.oracleProfile,
          parentOracleProfile:   s.parentOracleProfile ? normalizeOracleProfile(s.parentOracleProfile, 'parent') : prev.parentOracleProfile,
          oracleSessions:        s.oracleSessions       ? normalizeOracleSessions(s.oracleSessions, 'teen')       : prev.oracleSessions,
          parentOracleSessions:  s.parentOracleSessions ? normalizeOracleSessions(s.parentOracleSessions, 'parent') : prev.parentOracleSessions,
          moodHistory:      Array.isArray(s.moodHistory)       ? s.moodHistory       : prev.moodHistory,
          circlePosts:      Array.isArray(s.circlePosts)       ? s.circlePosts       : prev.circlePosts,
          parentCirclePosts:Array.isArray(s.parentCirclePosts) ? s.parentCirclePosts : prev.parentCirclePosts,
          voiceNotes:       Array.isArray(s.voiceNotes)        ? s.voiceNotes        : prev.voiceNotes,
          parentVoiceNotes: Array.isArray(s.parentVoiceNotes)  ? s.parentVoiceNotes  : prev.parentVoiceNotes,
          comfortSessions:  Array.isArray(s.comfortSessions)   ? s.comfortSessions   : prev.comfortSessions,
          crewMembers:      Array.isArray(s.crewMembers)       ? s.crewMembers       : prev.crewMembers,
          crewCheckIns:     Array.isArray(s.crewCheckIns)      ? s.crewCheckIns      : prev.crewCheckIns,
          periodDays:       Array.isArray(s.periodDays)        ? s.periodDays        : prev.periodDays,
          streakDays:   Number(s.streakDays) || 0,
          lastOpenDate: s.lastOpenDate ?? prev.lastOpenDate,
          roomMemory: s.roomMemory
            ? (typeof s.roomMemory === 'string' ? JSON.parse(s.roomMemory) : s.roomMemory)
            : prev.roomMemory,
          parentRoomStyle:
            s.parentRoomStyle === 'mom' || s.parentRoomStyle === 'dad'
              ? s.parentRoomStyle
              : prev.parentRoomStyle,
          parentMood:     s.parentMood     ?? prev.parentMood,
          parentMoodDate: s.parentMoodDate ?? prev.parentMoodDate,
        }));
      } catch {
        // Storage read failure — continue with defaults
      }
      setState(prev => ({ ...prev, isLoading: false }));
    })();
  }, []);

  // 2. userSide change → show splash gate
  // No auto-advance timer. The SplashScreen CTA (setScreen('home')) is the
  // only way to enter either side. Both teen and parent splashes stay until
  // the user taps.
  useEffect(() => {
    if (isLoading) return;
    setState(prev => ({ ...prev, screen: 'splash' }));
  }, [userSide]); // intentional: only re-run when side changes

  // 3. Supabase: pull and merge only for an authenticated account.
  // Signed-out users stay at the auth boundary; no anonymous account is created.
  // Re-run the same merge when the app becomes active so cloud-backed UI does not
  // remain stale after backgrounding, tab switches, or edits from another device.
  useEffect(() => {
    if (!isSupabaseConfigured || isLoading) return;
    let cancelled = false;
    let refreshInFlight = false;

    const refreshCloudState = async () => {
      if (cancelled || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const uid = await getCurrentSessionUserId();
        if (!uid || cancelled) return;

        // Bulk pull (mood, journal, circle, voice, comfort, crew, room)
        const cloud = await pullAll();
        if (!cloud || cancelled) return;
        if (__DEV__)
          console.log('[sync] cloud counts', {
            mood:         cloud.moodHistory.length,
            journal:      cloud.journalEntries.length,
            circle:       cloud.circlePosts.length,
            parentCircle: cloud.parentCirclePosts.length,
            voice:        cloud.voiceNotes.length,
            comfort:      cloud.comfortSessions.length,
            crew:         cloud.crewMembers.length,
            checkIns:     cloud.crewCheckIns.length,
            roomMemory:   cloud.roomMemory ? 'present' : 'null',
          });
        setState(prev => ({
          ...prev,
          moodHistory:       mergeById(prev.moodHistory,       cloud.moodHistory),
          journalEntries:    mergeById(prev.journalEntries,    cloud.journalEntries),
          circlePosts:       mergeById(prev.circlePosts,       cloud.circlePosts),
          parentCirclePosts: mergeById(prev.parentCirclePosts, cloud.parentCirclePosts),
          voiceNotes:        mergeById(prev.voiceNotes,        cloud.voiceNotes),
          comfortSessions:   mergeById(prev.comfortSessions,   cloud.comfortSessions),
          crewMembers:       mergeById(prev.crewMembers,       cloud.crewMembers),
          crewCheckIns:      mergeById(prev.crewCheckIns,      cloud.crewCheckIns),
          roomMemory: cloud.roomMemory
            ? { ...prev.roomMemory, ...cloud.roomMemory }
            : prev.roomMemory,
        }));

        // Period days — additive merge (union of local + cloud sets)
        if (!cancelled) {
          const cloudDays = await loadPeriodDays();
          if (cloudDays.length > 0) {
            setState(prev => ({
              ...prev,
              periodDays: Array.from(new Set([...prev.periodDays, ...cloudDays])).sort(),
            }));
          }
        }

        // Oracle discovery profiles — restore full structured profiles from oracle_records
        if (!cancelled) {
          const [teenProfile, parentProfile] = await Promise.all([
            restoreOracleDiscovery('teen'),
            restoreOracleDiscovery('parent'),
          ]);
          if (teenProfile || parentProfile) {
            setState(prev => ({
              ...prev,
              ...(teenProfile   ? { oracleProfile:       teenProfile   } : {}),
              ...(parentProfile ? { parentOracleProfile: parentProfile } : {}),
            }));
          }
        }
      } finally {
        refreshInFlight = false;
      }
    };

    void refreshCloudState();
    const appStateSubscription = NativeAppState.addEventListener('change', nextState => {
      if (nextState === 'active') void refreshCloudState();
    });

    return () => {
      cancelled = true;
      appStateSubscription.remove();
    };
  }, [isLoading]); // intentional: initial hydration + active-state refreshes only

  // 3b. Teen activity summary: keep parent-facing snapshot fresh.
  // Runs only for teen-side users and writes only aggregated streak/session/tier data.
  useEffect(() => {
    if (!isSupabaseConfigured || isLoading || userSide !== 'teen') return;
    return initTeenActivitySync();
  }, [isLoading, userSide]);

  // 3c. Point ledger: subscribe to activity events and record transactions.
  // Backfills existing local data on first run so the total is accurate immediately.
  useEffect(() => {
    if (isLoading || userSide !== 'teen') return;
    return initPointLedger({
      moodCount:    state.moodHistory.length,
      journalCount: state.journalEntries.length,
      voiceCount:   state.voiceNotes.length,
      circleCount:  state.circlePosts.length,
      comfortCount: state.comfortSessions.length,
      crewCount:    state.crewCheckIns.length,
      streakDays:   state.streakDays,
    });
  }, [isLoading, userSide]);

  // 4. Persist current state after hydration.
  useEffect(() => {
    if (isLoading) return;
    void saveState({
      theme: state.theme,
      mood: state.mood,
      userSide: state.userSide,
      selectedSekret: state.selectedSekret,
      sekretMode: state.sekretMode,
      journalText: state.journalText,
      entries: state.journalEntries,
      parentPagesDraft: state.parentPagesDraft,
      parentPagesEntries: state.parentPagesEntries,
      oracleJournalEntries: state.oracleJournalEntries,
      oracleProfile: state.oracleProfile,
      parentOracleProfile: state.parentOracleProfile,
      oracleSessions: state.oracleSessions,
      parentOracleSessions: state.parentOracleSessions,
      moodHistory: state.moodHistory,
      circlePosts: state.circlePosts,
      parentCirclePosts: state.parentCirclePosts,
      voiceNotes: state.voiceNotes,
      parentVoiceNotes: state.parentVoiceNotes,
      comfortSessions: state.comfortSessions,
      crewMembers: state.crewMembers,
      crewCheckIns: state.crewCheckIns,
      periodDays: state.periodDays,
      streakDays: state.streakDays,
      lastOpenDate: state.lastOpenDate,
      roomMemory: state.roomMemory,
      parentRoomStyle: state.parentRoomStyle,
      parentMood: state.parentMood,
      parentMoodDate: state.parentMoodDate,
    });
  }, [state, isLoading]);

  // 5. Streak tracking
  useEffect(() => {
    if (isLoading) return;
    const today = new Date().toISOString().slice(0, 10);
    if (lastOpenDate === today) return;

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    setState(prev => ({
      ...prev,
      streakDays: prev.lastOpenDate === yesterday ? prev.streakDays + 1 : 1,
      lastOpenDate: today,
    }));
    emitEvent('app_opened', { date: today });
  }, [isLoading, lastOpenDate]);

  // 6. Rotating home message
  useEffect(() => {
    if (isLoading) return;
    const index = Math.floor(Date.now() / 86_400_000) % HOME_MESSAGES.length;
    setState(prev => ({ ...prev, homeMessage: HOME_MESSAGES[index] }));
  }, [isLoading]);
}
