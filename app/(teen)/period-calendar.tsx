import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { THEME_PACKS } from '@constants/theme';
import { PeriodCalendarScreen } from '@screens/PeriodCalendarScreen';

export default function PeriodCalendarRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const currentTheme = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  return (
    <PeriodCalendarScreen
      theme={currentTheme}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      BottomNav={null}
      backTarget="sekret"
    />
  );
}
