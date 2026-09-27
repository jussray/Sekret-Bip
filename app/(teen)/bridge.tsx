import React from 'react';
import { View } from 'react-native';
import { BridgeScreen } from '@screens/BridgeScreen';
import { BridgeResponsePreferenceDock } from '../../components/bridge/BridgeResponsePreferenceDock';
import { useAppContext } from '@/context/AppContext';
import { navigateTo } from '@/utils/navigation';
import { THEME_PACKS, SEKRET_PROFILES } from '@/constants/theme';

export default function BridgeRoute() {
  const { theme, mood, selectedSekret } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const currentSekret = SEKRET_PROFILES[selectedSekret ?? 'rylane'] ?? SEKRET_PROFILES['rylane'] ?? {};

  return (
    <View style={{ flex: 1 }}>
      <BridgeScreen
        t={t}
        currentSekret={currentSekret}
        setScreen={(screen: string) => navigateTo(screen, 'teen')}
        BottomNav={null}
        selectedSekret={selectedSekret}
        mood={mood}
      />
      <BridgeResponsePreferenceDock />
    </View>
  );
}
