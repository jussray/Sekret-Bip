import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { THEME_PACKS } from '@constants/theme';
import { VoiceBipScreen } from '@screens/VoiceBipScreen';
import type { VoiceNote } from '@/types';
import { syncVoiceNote } from '@/utils/sync';

export default function VoiceBipRoute() {
  const {
    theme,
    mood,
    selectedSekret,
    setSelectedSekret,
    voiceNotes,
    setVoiceNotes,
  } = useAppContext();

  const currentTheme = THEME_PACKS[theme] ?? THEME_PACKS['neon'];

  return (
    <VoiceBipScreen
      theme={currentTheme}
      mood={mood}
      selectedSekret={selectedSekret}
      onSelectAvatar={setSelectedSekret}
      voiceNotes={voiceNotes}
      setVoiceNotes={setVoiceNotes}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      BottomNav={null}
      onSave={(note: VoiceNote) => {
        setVoiceNotes(prev => [note, ...prev]);
        syncVoiceNote(note);
      }}
    />
  );
}
