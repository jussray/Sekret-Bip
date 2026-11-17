import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { ComfortScreen } from '@screens/ComfortScreen';
import { navigateTo } from '@/utils/navigation';
import { emitEvent } from '@/features/activity/events';

export default function ComfortRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <ComfortScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      BottomNav={null}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      onComplete={() => emitEvent('comfort_completed')}
    />
  );
}
