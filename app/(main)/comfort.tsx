/**
 * app/(main)/comfort.tsx
 * Route wrapper for ComfortScreen.
 */
import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { ComfortScreen } from '@screens/ComfortScreen';
import { syncComfortSession } from '@/utils/sync';

export default function ComfortRoute() {
  const { theme, mood, selectedSekret, comfortSessions, setComfortSessions } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  const handleComplete = useCallback(() => {
    const session = {
      id: Date.now(),
      type: 'comfort',
      mood,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setComfortSessions(prev => [session, ...prev]);
    syncComfortSession(session);
  }, [mood, setComfortSessions]);

  return (
    <ComfortScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      BottomNav={null}
      onComplete={handleComplete}
      setScreen={(screen: string) => router.push(`/(main)/${screen}` as any)}
    />
  );
}
