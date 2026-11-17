/**
 * src/components/room/overlays/CurtainSway.tsx
 *
 * Thin curtain strips that sway with a sine-wave rotation.
 * Rendered at the top-left and top-right of the room.
 * Intensity scales with weather (rain = more sway).
 */

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const CURTAIN_WIDTH = W * 0.12;
const CURTAIN_HEIGHT = H * 0.55;

interface CurtainProps {
  side: 'left' | 'right';
  amplitude: number;
  duration: number;
  color: string;
}

function Curtain({ side, amplitude, duration, color }: CurtainProps) {
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Left curtain sways right-first, right curtain left-first.
    const sign = side === 'left' ? 1 : -1;
    rotate.value = withRepeat(
      withSequence(
        withTiming(sign * amplitude, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-sign * amplitude * 0.6, { duration: duration * 0.9, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [rotate, side, amplitude, duration]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -CURTAIN_HEIGHT / 2 },
      { rotate: `${rotate.value}deg` },
      { translateY: CURTAIN_HEIGHT / 2 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.curtain,
        animStyle,
        {
          [side]: 0,
          backgroundColor: color,
          transformOrigin: `${side === 'left' ? '0%' : '100%'} 0%`,
        },
      ]}
    />
  );
}

interface CurtainSwayProps {
  /** 0 = still, 1 = heavy sway (stormy) */
  intensity?: number;
  /** Curtain color — should match room palette */
  color?: string;
}

export function CurtainSway({ intensity = 0.3, color = 'rgba(220,200,180,0.35)' }: CurtainSwayProps) {
  const amplitude = 2 + intensity * 5;  // 2–7 degrees
  const duration  = 4000 - intensity * 1500; // 4000–2500ms

  return (
    <View style={styles.container} pointerEvents="none">
      <Curtain side="left"  amplitude={amplitude} duration={duration}  color={color} />
      <Curtain side="right" amplitude={amplitude} duration={duration * 1.1} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    top: 0,
  },
  curtain: {
    position: 'absolute',
    top: 0,
    width: CURTAIN_WIDTH,
    height: CURTAIN_HEIGHT,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
