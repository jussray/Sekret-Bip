/**
 * Positions a companion according to its canonical room contract.
 * The layer keeps legacy runtime keys working while exposing canonical roles.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SekretSprite, type SekretMood } from './SekretSprite';
import {
  getCompanionRuntime,
  type CompanionRuntimeKey,
} from '@/config/companionRuntimeRegistry';

interface CharacterLayerProps {
  sekret: CompanionRuntimeKey;
  mood?: SekretMood;
}

export function CharacterLayer({ sekret, mood }: CharacterLayerProps) {
  const runtime = getCompanionRuntime(sekret);

  if (!runtime.available) return null;

  return (
    <View
      style={[
        styles.container,
        styles[runtime.anchor.horizontal],
        { paddingBottom: `${runtime.anchor.bottomPercent}%` as never },
      ]}
      pointerEvents="none"
      testID={`companion-layer-${runtime.id}`}
    >
      <SekretSprite sekret={runtime.id} mood={mood} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  left: {
    alignItems: 'flex-start',
    paddingLeft: '7%',
  },
  center: {
    alignItems: 'center',
  },
  right: {
    alignItems: 'flex-end',
    paddingRight: '7%',
  },
});
