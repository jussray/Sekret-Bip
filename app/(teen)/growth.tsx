import React from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { GrowthScreen } from '@screens/GrowthScreen';
import { routeForSide } from '@/shared/routes';
import { syncGrowthMilestone } from '@/utils/sync';

export default function GrowthRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <GrowthScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      onMilestone={(key) => { void syncGrowthMilestone(key); }}
      BottomNav={null}
    />
  );
}
