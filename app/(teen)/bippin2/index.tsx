import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { Bippin2Screen } from '@screens/Bippin2Screen';
import { routeForSide } from '@/shared/routes';
import { syncGrowthMilestone } from '@/utils/sync';
import { loadSekretMemory } from '../../../services/sekretMemory';

export default function Bippin2Route() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    loadSekretMemory().then(mem => setStreakDays(mem.streaks.current));
  }, []);

  return (
    <Bippin2Screen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      streakDays={streakDays}
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      BottomNav={null}
      side="teen"
      onMilestone={() => { void syncGrowthMilestone('bippin2'); }}
      onOpenGuide={(guide) => router.push(`/(teen)/bippin2/${guide}` as any)}
    />
  );
}
