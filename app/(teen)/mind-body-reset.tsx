import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { MindBodyResetScreen } from '@screens/MindBodyResetScreen';
import { routeForSide } from '@/shared/routes';

export default function MindBodyResetRoute() {
  const { mode } = useLocalSearchParams<{ mode?: 'mindReset' | 'bodyReset' }>();
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  const changeMode = (nextMode: 'mindReset' | 'bodyReset') => {
    router.replace({
      pathname: '/(teen)/mind-body-reset' as any,
      params: { mode: nextMode },
    });
  };

  return (
    <MindBodyResetScreen
      screen={mode ?? 'mindReset'}
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      setScreen={(screen: string) => router.push(routeForSide('teen', screen) as any)}
      onChangeMode={changeMode}
      onStartWorkout={(routineId: string) => {
        router.push({
          pathname: '/(teen)/body-workout' as any,
          params: { routineId },
        });
      }}
      BottomNav={null}
    />
  );
}
