/**
 * BareRoomRenderer
 *
 * Compatibility renderer for the User Room layer stack.
 *
 * The previous implementation drew a temporary empty room in React Native.
 * That was useful during extraction work, but it bypassed the production room
 * artwork that already contains the furnished environment and hotspot objects.
 *
 * Keep this component's API stable for UserRoomScreen while restoring the
 * production art-led room backgrounds. Lighting variants still follow the
 * existing RoomPhase grammar, and interaction remains owned by UserRoomScreen.
 */

import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { IMAGES, type Character, type RoomPhase } from '../../constants/theme';
import type { LightingMode } from '../../screens/UserRoomScreen';

type RoomArtMap = Record<RoomPhase, ImageSourcePropType>;

const ROOM_ART: Record<Character, RoomArtMap> = {
  raylene: {
    day: IMAGES.bgRayleneRoomDay,
    midday: IMAGES.bgRayleneRoomMidday,
    afternoon: IMAGES.bgRayleneRoomAfternoon,
    evening: IMAGES.bgRayleneRoomEvening,
    rain: IMAGES.bgRayleneRoomRain,
    night: IMAGES.bgRayleneRoomNight,
    deepNight: IMAGES.bgRayleneRoomDeepNight,
  },
  rylane: {
    day: IMAGES.bgRylaneRoomDay,
    midday: IMAGES.bgRylaneRoomMidday,
    afternoon: IMAGES.bgRylaneRoomAfternoon,
    evening: IMAGES.bgRylaneRoomEvening,
    rain: IMAGES.bgRylaneRoomRain,
    night: IMAGES.bgRylaneRoomNight,
    deepNight: IMAGES.bgRylaneRoomDeepNight,
  },
  cloud: {
    day: IMAGES.bgCloudRoomDay,
    midday: IMAGES.bgCloudRoomMidday,
    afternoon: IMAGES.bgCloudRoomAfternoon,
    evening: IMAGES.bgCloudRoomEvening,
    rain: IMAGES.bgCloudRoomRain,
    night: IMAGES.bgCloudRoomNight,
    deepNight: IMAGES.bgCloudRoomDeepNight,
  },
  night: {
    day: IMAGES.bgNightRoomDay,
    midday: IMAGES.bgNightRoomMidday,
    afternoon: IMAGES.bgNightRoomAfternoon,
    evening: IMAGES.bgNightRoomEvening,
    rain: IMAGES.bgNightRoomRain,
    night: IMAGES.bgNightRoomNight,
    deepNight: IMAGES.bgNightRoomDeepNight,
  },
};

function resolvePhase(lightingMode: LightingMode): RoomPhase {
  return lightingMode === 'auto' ? 'day' : lightingMode;
}

interface BareRoomRendererProps {
  character: Character;
  lightingMode: LightingMode;
}

export function BareRoomRenderer({ character, lightingMode }: BareRoomRendererProps) {
  const phase = resolvePhase(lightingMode);
  const source = ROOM_ART[character]?.[phase] ?? ROOM_ART[character].day;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        testID="room-production-art"
        source={source}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
}
