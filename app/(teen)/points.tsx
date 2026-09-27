import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { PointsScreen } from '@screens/PointsScreen';
import { navigateTo } from '@/utils/navigation';
import { useStreak } from '@/hooks/useStreak';

export default function PointsRoute() {
  const {
    theme,
    mood,
    selectedSekret,
    moodHistory,
    entries,
    voiceNotes,
    circlePosts,
    comfortSessions,
    crewCheckIns,
  } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const { streakDays } = useStreak();

  return (
    <PointsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      moodHistory={moodHistory}
      journalEntries={entries}
      voiceNotes={voiceNotes}
      circlePosts={circlePosts}
      comfortSessions={comfortSessions}
      crewCheckIns={crewCheckIns}
      streakDays={streakDays}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      BottomNav={null}
    />
  );
}
