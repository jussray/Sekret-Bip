/**
 * src/components/room/overlays/RainOverlay.tsx
 *
 * Purely Reanimated 4 rain streaks.
 * Density is controlled by the `intensity` prop (0–1).
 * Each streak is a thin semi-transparent View animated with
 * withRepeat + withTiming so it loops forever without re-renders.
 */

import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const BASE_STREAKS = 40;

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface StreakProps {
  index: number;
  intensity: number;
}

function RainStreak({ index, intensity }: StreakProps) {
  const r = (offset: number) => seededRandom(index * 7 + offset);

  const startX   = r(0) * W;
  const width    = 1 + r(1) * 1.5;
  const height_  = 12 + r(2) * 20;
  const duration = 600 + r(3) * 400;
  const delay    = r(4) * duration;
  const opacity_ = 0.15 + r(5) * 0.25 * intensity;

  const translateY = useSharedValue(-height_);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(H + height_, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, [translateY, delay, duration, height_]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.streak,
        animStyle,
        {
          left: startX,
          width,
          height: height_,
          opacity: opacity_,
        },
      ]}
    />
  );
}

interface RainOverlayProps {
  /** 0 = none, 1 = heavy downpour */
  intensity?: number;
}

export function RainOverlay({ intensity = 0.7 }: RainOverlayProps) {
  const count = Math.round(BASE_STREAKS * intensity);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <RainStreak key={i} index={i} intensity={intensity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  streak: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#a8c8e8',
    borderRadius: 1,
  },
});
