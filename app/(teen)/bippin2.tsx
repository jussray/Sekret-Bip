import React from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { Bippin2Screen } from '@screens/Bippin2Screen';
import { routeForSide } from '@/shared/routes';

export default function Bippin2Route() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <Bippin2Screen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      side="teen"
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      BottomNav={null}
    />
  );
}
