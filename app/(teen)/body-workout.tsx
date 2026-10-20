import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { emitEvent } from '@/features/activity/events';
import { BodyWorkoutFlow } from '@/features/reset/ResetFlows';
import { getWorkoutRoutine } from '@/features/reset/catalog';

const CHARACTER_NAMES: Record<string, string> = {
  raylene: 'Suhana',
  soft: 'Suhana',
  rylane: 'Sy',
  cloud: 'Cloud',
  night: 'Night',
};

export default function BodyWorkoutRoute() {
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { theme, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const routine = getWorkoutRoutine(routineId);
  const companionName = CHARACTER_NAMES[selectedSekret] ?? 'Suhana';

  const returnToBodyReset = () => {
    router.replace({
      pathname: '/(teen)/mind-body-reset' as any,
      params: { mode: 'bodyReset' },
    });
  };

  return (
    <BodyWorkoutFlow
      routine={routine}
      theme={t}
      companionName={companionName}
      onExit={returnToBodyReset}
      onComplete={(activeSeconds: number) => {
        emitEvent('comfort_completed', {
          durationSecs: activeSeconds,
          routineId: routine.id,
          resetMode: 'body',
          completionKind: 'workout',
          exerciseCount: routine.exercises.length,
          intensity: routine.intensity,
        });
      }}
    />
  );
}
