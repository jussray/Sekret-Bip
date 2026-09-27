// app/(teen)/room.tsx
//
// ROUTING RULE:
//   Sekret hotspot tap → /(teen)/pages (with companion param)
//   companion-chat.tsx is backend/service logic — NOT a user-facing destination.
//   Do not push to /(teen)/companion-chat from this file.

import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { UserRoomScreen } from '@screens/UserRoomScreen';
import { VisualCanonAtmosphere } from '../../components/rooms/VisualCanonAtmosphere';
import { BipReturnOverlay } from '../../components/retention/BipReturnOverlay';
import { DailyIntentionsCard } from '../../components/intentions/DailyIntentionsCard';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@/constants/theme';
import { TEEN_ROUTES } from '@/teen/routes';
import { routeForSide } from '@/shared/routes';

const ROOM_VIBES = ['rylane', 'cloud', 'night', 'rain', 'sunset'] as const;

type RoomVibe = (typeof ROOM_VIBES)[number];

function resolveRoomVibe(theme: string): RoomVibe | 'raylene' {
  return ROOM_VIBES.includes(theme as RoomVibe) ? (theme as RoomVibe) : 'raylene';
}

function resolveCompanionKey(selectedSekret: string | null | undefined): string {
  return selectedSekret === 'soft' || !selectedSekret ? 'raylene' : selectedSekret;
}

export default function TeenRoomRoute() {
  const {
    mood,
    selectedSekret,
    setSelectedSekret,
    theme,
    updateRoomMemory,
    entries,
    comfortSessions,
    voiceNotes,
    isLoading,
  } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.raylene;
  const vibe = resolveRoomVibe(theme);
  const companionKey = resolveCompanionKey(selectedSekret);

  useEffect(() => {
    updateRoomMemory({
      character: companionKey,
      lastVisit: new Date().toISOString(),
    });
    // A Room mount is one visit. Hotspot and companion taps update their own
    // fields without incrementing the visit counter.
  }, []);

  const handleScreen = (screen: string) => {
    if (screen === 'sekret') {
      // Land on Pages with the current companion pre-selected.
      // companion-chat.tsx is service logic — not a user destination.
      router.push({
        pathname: TEEN_ROUTES.pages,
        params: { companion: companionKey },
      } as never);
      return;
    }

    router.push(routeForSide('teen', screen) as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#09031c' }}>
      <UserRoomScreen
        mood={mood}
        selectedSekret={selectedSekret}
        setSelectedSekret={setSelectedSekret}
        setScreen={handleScreen}
        t={t}
        vibe={vibe}
        BottomNav={null}
        sekretMode={selectedSekret}
        updateRoomMemory={updateRoomMemory}
      />
      <VisualCanonAtmosphere />
      <DailyIntentionsCard
        mood={mood}
        companionKey={companionKey}
        entries={entries}
        comfortSessions={comfortSessions}
        voiceNotes={voiceNotes}
        isLoading={isLoading}
      />
      <BipReturnOverlay onNavigate={handleScreen} />
    </View>
  );
}
