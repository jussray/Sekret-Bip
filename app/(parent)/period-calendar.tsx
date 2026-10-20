import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { parentNavigateTo } from '@/parent/navigation';
import { THEME_PACKS } from '@constants/theme';
import { ParentPeriodCalendarScreen } from '@/parent/features/period-calendar/ParentPeriodCalendarScreen';

export default function ParentPeriodCalendarRoute() {
  const { theme } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  return (
    <ParentPeriodCalendarScreen
      theme={t}
      setScreen={parentNavigateTo}
      backTarget="pages"
      BottomNav={null}
    />
  );
}
