import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { GrowthScreen } from '@screens/GrowthScreen';
import { routeForSide } from '@/shared/routes';
import { syncGrowthMilestone } from '@/utils/sync';
import { loadSekretMemory } from '../../services/sekretMemory';

export default function GrowthRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    loadSekretMemory().then(mem => setStreakDays(mem.streaks.current));
  }, []);

  return (
    <GrowthScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      streakDays={streakDays}
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      onMilestone={(key) => { void syncGrowthMilestone(key); }}
      BottomNav={null}
    />
  );
}
