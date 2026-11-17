import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { GrowthScreen } from '@screens/GrowthScreen';
import { routeForSide } from '@/shared/routes';
import { useStreak } from '@/hooks/useStreak';
import { emitEvent } from '@/features/activity/events';
import { getSupabase } from '@/utils/supabase';
import { getCurrentSessionUserId } from '@/services/session';
import { growthMilestoneCloud } from '@/utils/sync';
import {
  loadGrowthProgress, mergeGrowthKeys, persistGrowthProgress,
  type GrowthTrackKey,
} from '@/features/growth/progress';

export default function GrowthRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const { streakDays } = useStreak();
  const [ownerId, setOwnerId] = useState<string | null | undefined>(undefined);
  const [completedKeys, setCompletedKeys] = useState<GrowthTrackKey[]>([]);
  const [progressReady, setProgressReady] = useState(false);
  const completedRef = useRef<GrowthTrackKey[]>([]);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setOwnerId(null); return; }
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setOwnerId(session?.user && !session.user.is_anonymous ? session.user.id : null);
    });
    void getCurrentSessionUserId()
      .then(id => setOwnerId(previous => previous === undefined ? id : previous))
      .catch(() => setOwnerId(previous => previous === undefined ? null : previous));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    completedRef.current = [];
    setCompletedKeys([]);
    setProgressReady(false);
    if (ownerId === undefined) return;
    if (ownerId === null) { setProgressReady(true); return; }
    void loadGrowthProgress(ownerId, AsyncStorage, growthMilestoneCloud)
      .then(keys => {
        if (!cancelled) { completedRef.current = keys; setCompletedKeys(keys); }
      })
      .finally(() => { if (!cancelled) setProgressReady(true); });
    return () => { cancelled = true; };
  }, [ownerId]);

  const handleMilestone = (key: GrowthTrackKey) => {
    if (!progressReady || completedRef.current.includes(key)) return;
    const next = mergeGrowthKeys(completedRef.current, [key]);
    completedRef.current = next;
    setCompletedKeys(next);
    emitEvent('goal_completed');
    if (!ownerId) return; // Guest completions exist only in this mounted screen.
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => persistGrowthProgress(ownerId, next, AsyncStorage, growthMilestoneCloud));
  };

  return (
    <GrowthScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      completedKeys={completedKeys}
      progressReady={progressReady}
      onMilestone={handleMilestone}
      streakDays={streakDays}
      BottomNav={null}
    />
  );
}
