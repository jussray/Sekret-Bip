import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { CloudThoughtsScreen } from '@screens/CloudThoughtsScreen';
import { navigateTo } from '@/utils/navigation';

export default function CloudRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <CloudThoughtsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      BottomNav={null}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      backTarget="calm"
    />
  );
}
