/**
 * BareRoomRenderer
 *
 * Production room-art renderer for the User Room layer stack.
 *
 * The canonical runtime backgrounds are the large room-only PNGs in
 * assets/images/archive. They preserve the furnished environment and hotspot
 * geometry without baking a companion into the background. Scene/reference
 * JPEG composites are design evidence only and must never become runtime art.
 *
 * Keep this component's API stable for UserRoomScreen. The Room owns one
 * separate companion layer and all interaction geometry remains in
 * UserRoomScreen.
 */

import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { type Character, type RoomPhase } from '../../constants/theme';
import type { LightingMode } from '../../screens/UserRoomScreen';

type RoomArtMap = Record<RoomPhase, ImageSourcePropType>;

const ROOM_ART: Record<Character, RoomArtMap> = {
  raylene: {
    day: require('../../assets/images/archive/bg-raylene-room-day.png'),
    midday: require('../../assets/images/archive/bg-raylene-room-midday.png'),
    afternoon: require('../../assets/images/archive/bg-raylene-room-afternoon.png'),
    evening: require('../../assets/images/archive/bg-raylene-room-evening.png'),
    rain: require('../../assets/images/archive/bg-raylene-room-rain.png'),
    night: require('../../assets/images/archive/bg-raylene-room-night.png'),
    deepNight: require('../../assets/images/archive/bg-raylene-room-deep-night.png'),
  },
  rylane: {
    day: require('../../assets/images/archive/bg-rylane-room-day.png'),
    midday: require('../../assets/images/archive/bg-rylane-room-midday.png'),
    afternoon: require('../../assets/images/archive/bg-rylane-room-afternoon.png'),
    evening: require('../../assets/images/archive/bg-rylane-room-evening.png'),
    rain: require('../../assets/images/archive/bg-rylane-room-rain.png'),
    night: require('../../assets/images/archive/bg-rylane-room-night.png'),
    deepNight: require('../../assets/images/archive/bg-rylane-room-deep-night.png'),
  },
  cloud: {
    day: require('../../assets/images/archive/bg-cloud-room-day.png'),
    midday: require('../../assets/images/archive/bg-cloud-room-midday.png'),
    afternoon: require('../../assets/images/archive/bg-cloud-room-afternoon.png'),
    evening: require('../../assets/images/archive/bg-cloud-room-evening.png'),
    rain: require('../../assets/images/archive/bg-cloud-room-rain.png'),
    night: require('../../assets/images/archive/bg-cloud-room-night.png'),
    deepNight: require('../../assets/images/archive/bg-cloud-room-deep-night.png'),
  },
  night: {
    day: require('../../assets/images/archive/bg-night-room-day.png'),
    midday: require('../../assets/images/archive/bg-night-room-midday.png'),
    afternoon: require('../../assets/images/archive/bg-night-room-afternoon.png'),
    evening: require('../../assets/images/archive/bg-night-room-evening.png'),
    rain: require('../../assets/images/archive/bg-night-room-rain.png'),
    night: require('../../assets/images/archive/bg-night-room-night.png'),
    deepNight: require('../../assets/images/archive/bg-night-room-deep-night.png'),
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
