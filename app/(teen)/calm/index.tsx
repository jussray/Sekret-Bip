import React from 'react';
import { router } from 'expo-router';
import { CalmScreen } from '@screens/CalmScreen';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { THEME_PACKS } from '@/constants/theme';

export default function CalmRoute() {
  const { theme, mood, setMood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  return (
    <CalmScreen
      t={t}
      mood={mood}
      setMood={setMood}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      BottomNav={null}
      selectedSekret={selectedSekret}
      onOpenBreathe={() => router.push('/(teen)/calm/breathe' as any)}
    />
  );
}
