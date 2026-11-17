import React, { useMemo } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { InsightsScreen } from '@screens/InsightsScreen';
import { routeForSide } from '@/shared/routes';
import { calculateStreak } from '@/utils/streak';

export default function InsightsRoute() {
  const {
    mood, moodHistory, entries, voiceNotes, comfortSessions, userSide,
  } = useAppContext();

  const streakDays = useMemo(
    () => calculateStreak(moodHistory, entries, voiceNotes),
    [moodHistory, entries, voiceNotes],
  );

  const side = userSide === 'parent' ? 'parent' : 'teen';

  return (
    <InsightsScreen
      side={side}
      mood={mood}
      moodHistory={moodHistory}
      entries={entries}
      voiceNotes={voiceNotes}
      comfortSessions={comfortSessions}
      streakDays={streakDays}
      setScreen={(screen: string) => router.push(routeForSide(side, screen) as any)}
      BottomNav={null}
    />
  );
}
