import React, { useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { CloudThoughtsScreen } from '@screens/CloudThoughtsScreen';
import { navigateTo } from '@/utils/navigation';
import { syncVoiceNote } from '@/utils/sync';
import type { VoiceNote } from '@/types';

export default function CloudRoute() {
  const { theme, mood, selectedSekret, setVoiceNotes } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;

  const handleSave = useCallback((note: VoiceNote) => {
    setVoiceNotes(prev => [note, ...prev]);
    void syncVoiceNote(note);
  }, [setVoiceNotes]);

  return (
    <CloudThoughtsScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      BottomNav={null}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      backTarget="calm"
      onSave={handleSave}
    />
  );
}
