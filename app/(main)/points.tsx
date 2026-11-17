/**
 * app/(main)/points.tsx
 */
import React, { useMemo } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { PointsScreen } from '@screens/PointsScreen';
import { calculateStreak } from '@/utils/streak';

export default function PointsRoute() {
  const {
    theme, mood, selectedSekret,
    moodHistory, entries, circlePosts,
    voiceNotes, parentVoiceNotes,
    crewCheckIns,
    userSide,
  } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS['neon'];

  const notes = userSide === 'parent' ? parentVoiceNotes : voiceNotes;

  const streakDays = useMemo(
    () => calculateStreak(moodHistory, entries, notes),
    [moodHistory, entries, notes],
  );

  return (
    <PointsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      moodHistory={moodHistory}
      journalEntries={entries}
      voiceNotes={notes}
      circlePosts={circlePosts}
      comfortSessions={[]}
      crewCheckIns={crewCheckIns}
      streakDays={streakDays}
      setScreen={(screen: string) => router.push(`/(main)/${screen}` as any)}
      BottomNav={null}
    />
  );
}
