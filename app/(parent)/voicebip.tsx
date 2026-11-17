import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { THEME_PACKS } from '@constants/theme';
import { VoiceBipScreen } from '@screens/VoiceBipScreen';
import type { VoiceNote } from '@/types';
import { syncVoiceNote } from '@/utils/sync';

export default function ParentVoiceBipRoute() {
  const {
    theme,
    mood,
    selectedSekret,
    setSelectedSekret,
    parentVoiceNotes,
    setParentVoiceNotes,
  } = useAppContext();

  const currentTheme = THEME_PACKS[theme] ?? THEME_PACKS['neon'];

  return (
    <VoiceBipScreen
      theme={currentTheme}
      mood={mood}
      selectedSekret={selectedSekret}
      onSelectAvatar={setSelectedSekret}
      voiceNotes={parentVoiceNotes}
      setVoiceNotes={setParentVoiceNotes}
      setScreen={(screen: string) => navigateTo(screen, 'parent')}
      BottomNav={null}
      onSave={(note: VoiceNote) => {
        setParentVoiceNotes(prev => [note, ...prev]);
        syncVoiceNote(note);
      }}
    />
  );
}
