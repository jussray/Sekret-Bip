import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { BipCrewScreen } from '@screens/BipCrewScreen';
import { THEME_PACKS } from '@constants/theme';
import { navigateTo } from '@/utils/navigation';

export default function CrewRoute() {
  const {
    theme, mood, selectedSekret,
    crewMembers, setCrewMembers,
    crewCheckIns, setCrewCheckIns,
    syncStatus, withSyncWrap,
  } = useAppContext();

  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  return (
    <BipCrewScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      crewMembers={crewMembers}
      setCrewMembers={setCrewMembers}
      crewCheckIns={crewCheckIns}
      setCrewCheckIns={setCrewCheckIns}
      syncStatus={syncStatus}
      withSyncWrap={withSyncWrap}
      BottomNav={null}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
    />
  );
}
