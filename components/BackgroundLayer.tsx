import React, { useMemo } from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { IMAGES, getRoomScene } from '../constants/theme';

type VoiceKey = 'raylene' | 'rylane';
type ScreenKey = 'default' | 'bippin2' | 'voiceBip' | 'voiceVip';

type RoomVariant = {
  day: any;
  night: any;
};

const ROOM_VARIANTS: Record<VoiceKey, Record<ScreenKey, RoomVariant>> = {
  raylene: {
    default:  { day: IMAGES.rayleneWindow,    night: IMAGES.rayleneVoiceNight },
    bippin2:  { day: IMAGES.raylene_Bippin2Day, night: IMAGES.rayleneVoiceNight },
    voiceBip: { day: IMAGES.rayleneVoiceDay,  night: IMAGES.rayleneVoiceNight },
    voiceVip: { day: IMAGES.rayleneVoiceDay,  night: IMAGES.rayleneVoiceNight },
  },
  rylane: {
    default:  { day: IMAGES.rylaneWindow,     night: IMAGES.rylaneVoiceNight },
    bippin2:  { day: IMAGES.rylaneWindowDay,  night: IMAGES.rylaneVoiceNight },
    voiceBip: { day: IMAGES.rylaneVoiceDay,   night: IMAGES.rylaneVoiceNight },
    voiceVip: { day: IMAGES.rylaneVoiceDay,   night: IMAGES.rylaneVoiceNight },
  },
};

interface Props {
  character: VoiceKey;
  screenKey?: ScreenKey;
  isNight?: boolean;
  style?: object;
  children?: React.ReactNode;
}

const BackgroundLayer = React.memo(function BackgroundLayer({
  character,
  screenKey = 'default',
  isNight = false,
  style,
  children,
}: Props) {
  const variants = ROOM_VARIANTS[character] ?? ROOM_VARIANTS.raylene;
  const variant  = variants[screenKey]       ?? variants.default;
  const source   = isNight ? variant.night : variant.day;

  return (
    <ImageBackground source={source} style={[styles.bg, style]} resizeMode="cover">
      {children}
    </ImageBackground>
  );
});

export default BackgroundLayer;
export { BackgroundLayer };

const styles = StyleSheet.create({
  bg: { flex: 1 },
});
