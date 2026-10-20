/**
 * src/hooks/useLinkedTeen.ts
 *
 * Centralises all parent-visible teen data in one hook.
 * Used by the parent Bridge route; never throws.
 *
 * Returns:
 *   linkedTeenId    — teen's auth.uid, or null if no active link
 *   isLinked        — true once we've confirmed an active link
 *   activitySummary — streak / sessions / tier (aggregate, no PII)
 *   sharedJournal   — journal entries the teen explicitly shared
 *   sharedMoods     — mood check-ins the teen explicitly shared
 *   signals         — bridge signals (teen's "share this moment" actions)
 *   isLoading       — true until the first fetch completes
 */

import { useEffect, useState } from 'react';
import { getSupabase } from '@/utils/supabase';
import {
  fetchLinkedTeenId,
  fetchBridgeSignals,
  subscribeToBridgeSignals,
  type BridgeSignal,
} from '@/utils/parentBridgeCompat';
import { pullSharedWithParent } from '@/features/consent/consentLayer';

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
}

async function fetchActivitySummary(teenId: string): Promise<TeenActivitySummary | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('teen_activity_summary')
      .select('streak_days, session_count, points_tier')
      .eq('user_id', teenId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      streakDays:   (data.streak_days   as number) ?? 0,
      sessionCount: (data.session_count as number) ?? 0,
      pointsTier:   (data.points_tier   as string) ?? 't0',
    };
  } catch {
    return null;
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

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      setIsLoading(true);
      const id = await fetchLinkedTeenId();
      if (!id) {
        setIsLinked(false);
        setIsLoading(false);
        return;
      }
      setLinkedTeenId(id);
      setIsLinked(true);

      const [sigs, summary, journal, moods] = await Promise.all([
        fetchBridgeSignals(id),
        fetchActivitySummary(id),
        pullSharedWithParent<SharedJournalEntry>('journal_entries', id),
        pullSharedWithParent<SharedMoodEntry>('mood_history', id),
      ]);

      setSignals(sigs);
      setActivitySummary(summary);
      setSharedJournal(journal);
      setSharedMoods(moods);
      setIsLoading(false);

      subscribeToBridgeSignals(id, (sig) => {
        setSignals(prev => [sig, ...prev]);
      }).then(fn => { unsub = fn; });
    })();
    return () => { unsub(); };
  }, []);

  return { linkedTeenId, isLinked, activitySummary, sharedJournal, sharedMoods, signals, isLoading };
}
