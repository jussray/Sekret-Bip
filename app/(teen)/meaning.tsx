/**
 * app/(teen)/meaning.tsx
 * Route wrapper for MeaningScreen.
 */
import React from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { MeaningScreen } from '@screens/MeaningScreen';

export default function MeaningRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <MeaningScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      BottomNav={null}
      setScreen={(screen: string) => router.push(`/(teen)/${screen}` as any)}
    />
  );
}
