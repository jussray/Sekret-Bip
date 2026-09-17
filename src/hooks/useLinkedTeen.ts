/**
 * src/hooks/useLinkedTeen.ts
 *
 * Centralises all parent-visible teen data in one hook.
 * A successful empty read is distinct from a failed read so Parent Bridge never
 * turns backend failure into a false "nothing shared" state.
 */

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/utils/supabase';
import {
  fetchBridgeSignalsResult,
  subscribeToBridgeSignals,
  type BridgeSignal,
} from '@/utils/parentBridgeCompat';
import { pullSharedWithParentResult } from '@/features/consent/consentLayer';
import { resolveParentEntryState } from '@/services/parentEntryState';

export type { BridgeSignal };

export interface TeenActivitySummary {
  streakDays:   number;
  sessionCount: number;
  pointsTier:   string;
}

export interface SharedJournalEntry {
  id:         number;
  text:       string | null;
  mood_tag:   string | null;
  created_at: string;
}

export interface SharedMoodEntry {
  id:         number;
  mood:       string;
  created_at: string;
}

export interface LinkedTeenData {
  linkedTeenId:    string | null;
  isLinked:        boolean;
  activitySummary: TeenActivitySummary | null;
  sharedJournal:   SharedJournalEntry[];
  sharedMoods:     SharedMoodEntry[];
  signals:         BridgeSignal[];
  isLoading:       boolean;
  loadError:       boolean;
  reload:          () => void;
}

type ActivitySummaryResult =
  | { ok: true; value: TeenActivitySummary | null }
  | { ok: false; value: null };

async function fetchActivitySummaryResult(teenId: string): Promise<ActivitySummaryResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, value: null };
  try {
    const { data, error } = await sb
      .from('teen_activity_summary')
      .select('streak_days, session_count, points_tier')
      .eq('user_id', teenId)
      .maybeSingle();
    if (error) return { ok: false, value: null };
    if (!data) return { ok: true, value: null };
    return {
      ok: true,
      value: {
        streakDays:   (data.streak_days   as number) ?? 0,
        sessionCount: (data.session_count as number) ?? 0,
        pointsTier:   (data.points_tier   as string) ?? 't0',
      },
    };
  } catch {
    return { ok: false, value: null };
  }
}

export function useLinkedTeen(): LinkedTeenData {
  const [linkedTeenId,    setLinkedTeenId]    = useState<string | null>(null);
  const [isLinked,        setIsLinked]         = useState(false);
  const [activitySummary, setActivitySummary]  = useState<TeenActivitySummary | null>(null);
  const [sharedJournal,   setSharedJournal]    = useState<SharedJournalEntry[]>([]);
  const [sharedMoods,     setSharedMoods]      = useState<SharedMoodEntry[]>([]);
  const [signals,         setSignals]          = useState<BridgeSignal[]>([]);
  const [isLoading,       setIsLoading]        = useState(true);
  const [loadError,       setLoadError]        = useState(false);
  const [reloadToken,     setReloadToken]      = useState(0);

  const reload = useCallback(() => setReloadToken(value => value + 1), []);
  const clearLinkedSnapshot = useCallback(() => {
    setLinkedTeenId(null);
    setIsLinked(false);
    setActivitySummary(null);
    setSharedJournal([]);
    setSharedMoods([]);
    setSignals([]);
  }, []);

  useEffect(() => {
    let active = true;
    let unsub = () => {};

    (async () => {
      setIsLoading(true);
      setLoadError(false);
      // Parent-visible teen state must fail closed while relationship authority
      // is being re-verified. Never keep an old teen snapshot on screen through
      // a revoked link, provider failure, or account-side transition.
      clearLinkedSnapshot();

      try {
        const entryState = await resolveParentEntryState();
        if (!active) return;
        if (entryState.state !== 'ready') {
          clearLinkedSnapshot();
          return;
        }

        const id = entryState.teenUserId;
        const [signalResult, summaryResult, journalResult, moodResult] = await Promise.all([
          fetchBridgeSignalsResult(id),
          fetchActivitySummaryResult(id),
          pullSharedWithParentResult<SharedJournalEntry>('journal_entries', id),
          pullSharedWithParentResult<SharedMoodEntry>('mood_history', id),
        ]);
        if (!active) return;

        if (!signalResult.ok || !summaryResult.ok || !journalResult.ok || !moodResult.ok) {
          clearLinkedSnapshot();
          setLoadError(true);
          return;
        }

        setLinkedTeenId(id);
        setIsLinked(true);
        setSignals(signalResult.signals);
        setActivitySummary(summaryResult.value);
        setSharedJournal(journalResult.items);
        setSharedMoods(moodResult.items);

        subscribeToBridgeSignals(id, (sig) => {
          if (active) setSignals(prev => [sig, ...prev]);
        }).then(fn => {
          if (active) unsub = fn;
          else fn();
        });
      } catch {
        if (active) {
          clearLinkedSnapshot();
          setLoadError(true);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      unsub();
    };
  }, [clearLinkedSnapshot, reloadToken]);

  return {
    linkedTeenId,
    isLinked,
    activitySummary,
    sharedJournal,
    sharedMoods,
    signals,
    isLoading,
    loadError,
    reload,
  };
}
