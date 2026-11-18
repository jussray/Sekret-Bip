/**
 * app/(main)/s2tell.tsx
 */
import React from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { S2TellScreen } from '@screens/S2TellScreen';

export default function S2TellRoute() {
  const { theme, mood, selectedSekret, oracleProfile } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS['neon'];
  return (
    <S2TellScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      privateProfile={oracleProfile ?? undefined}
      setScreen={(screen: string) => router.push(`/(main)/${screen}` as any)}
      BottomNav={null}
    />
  );
}
