/**
 * src/components/room/RoomBackground.tsx  (v2 — full interactive room)
 *
 * Composes all four layers:
 *   1. Parallax background PNG  (Option A)
 *   2. Ambient light overlay    (Option C)
 *   3. Curtain sway overlay     (Option C)
 *   4. Rain overlay             (Option C — rain variant only)
 *   5. children (hotspot layer, character layer, UI chrome)
 *
 * Usage:
 *   <RoomBackground sekret="raylene" variant="evening">
 *     <CharacterLayer sekret="raylene" mood={mood} />
 *     <RoomHotspotLayer hotspots={myHotspots} />
 *     <YourChatUI />
 *   </RoomBackground>
 */

import React from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useRoomParallax } from './useRoomParallax';
import { AmbientLight, CurtainSway, RainOverlay, useRoomOverlays } from './overlays';
import type { TimeOfDay } from './overlays';

// ─── Asset map ────────────────────────────────────────────────────────────────

type Sekret = 'raylene' | 'rylane' | 'cloud' | 'night' | 'dad' | 'mom';
type Variant = TimeOfDay;

const ROOM_ASSETS: Record<Sekret, Partial<Record<Variant, ReturnType<typeof require>>>> = {
  raylene: {
    day:          require('../../../assets/images/archive/bg-raylene-room-day.png'),
    midday:       require('../../../assets/images/archive/bg-raylene-room-midday.png'),
    afternoon:    require('../../../assets/images/archive/bg-raylene-room-afternoon.png'),
    evening:      require('../../../assets/images/archive/bg-raylene-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-raylene-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-raylene-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-raylene-room-rain.png'),
  },
  rylane: {
    day:          require('../../../assets/images/archive/bg-rylane-room-day.png'),
    midday:       require('../../../assets/images/archive/bg-rylane-room-midday.png'),
    afternoon:    require('../../../assets/images/archive/bg-rylane-room-afternoon.png'),
    evening:      require('../../../assets/images/archive/bg-rylane-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-rylane-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-rylane-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-rylane-room-rain.png'),
  },
  cloud: {
    day:          require('../../../assets/images/archive/bg-cloud-room-day.png'),
    midday:       require('../../../assets/images/archive/bg-cloud-room-midday.png'),
    afternoon:    require('../../../assets/images/archive/bg-cloud-room-afternoon.png'),
    evening:      require('../../../assets/images/archive/bg-cloud-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-cloud-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-cloud-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-cloud-room-rain.png'),
  },
  night: {
    day:          require('../../../assets/images/archive/bg-night-room-day.png'),
    midday:       require('../../../assets/images/archive/bg-night-room-midday.png'),
    afternoon:    require('../../../assets/images/archive/bg-night-room-afternoon.png'),
    evening:      require('../../../assets/images/archive/bg-night-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-night-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-night-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-night-room-rain.png'),
  },
  dad: {
    day:          require('../../../assets/images/archive/bg-dad-room-day.png'),
    evening:      require('../../../assets/images/archive/bg-dad-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-dad-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-dad-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-dad-room-rain.png'),
  },
  mom: {
    day:          require('../../../assets/images/archive/bg-mom-room-day.png'),
    evening:      require('../../../assets/images/archive/bg-mom-room-evening.png'),
    night:        require('../../../assets/images/archive/bg-mom-room-night.png'),
    'deep-night': require('../../../assets/images/archive/bg-mom-room-deep-night.png'),
    rain:         require('../../../assets/images/archive/bg-mom-room-rain.png'),
  },
};

const BLEED = 8;

interface RoomBackgroundProps {
  sekret: Sekret;
  variant: Variant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function RoomBackground({ sekret, variant, style, children }: RoomBackgroundProps) {
  const { offset } = useRoomParallax();
  const { width, height } = Dimensions.get('window');
  const overlays = useRoomOverlays(sekret, variant);

  const source = ROOM_ASSETS[sekret]?.[variant] ?? ROOM_ASSETS[sekret]?.day;

  if (!source) return null;

  return (
    <View style={[styles.container, style]}>
      {/* Layer 1 — Parallax background */}
      <Animated.Image
        source={source}
        style={[
          styles.image,
          {
            width:  width  + BLEED * 2,
            height: height + BLEED * 2,
            marginLeft: -BLEED,
            marginTop:  -BLEED,
            transform: [
              { translateX: offset.x },
              { translateY: offset.y },
            ],
          },
        ]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      {/* Layer 2 — Ambient light */}
      <AmbientLight variant={overlays.ambientVariant} />

      {/* Layer 3 — Curtain sway */}
      <CurtainSway
        intensity={overlays.curtainIntensity}
        color={overlays.curtainColor}
      />

      {/* Layer 4 — Rain (only on rain variant) */}
      {overlays.rainIntensity > 0 && (
        <RainOverlay intensity={overlays.rainIntensity} />
      )}

      {/* Layer 5 — Children (character, hotspots, UI chrome) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
});
