/**
 * src/components/room/overlays/AmbientLight.tsx
 *
 * Breathing ambient light overlay matched to time-of-day.
 * Sits above the background, below UI chrome.
 * Uses a slow opacity pulse to make the room feel alive.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type TimeOfDay =
  | 'day'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'deep-night'
  | 'rain';

const AMBIENT: Record<TimeOfDay, { colors: [string, string]; pulseMin: number; pulseMax: number; duration: number }> = {
  day:        { colors: ['#fff8e715', '#fff8e700'], pulseMin: 0.0, pulseMax: 0.12, duration: 6000 },
  midday:     { colors: ['#fffde715', '#fffde700'], pulseMin: 0.0, pulseMax: 0.08, duration: 5000 },
  afternoon:  { colors: ['#ffe08215', '#ffe08200'], pulseMin: 0.05, pulseMax: 0.18, duration: 7000 },
  evening:    { colors: ['#ff6b3520', '#ff6b3500'], pulseMin: 0.1,  pulseMax: 0.25, duration: 8000 },
  night:      { colors: ['#1a1a4020', '#1a1a4000'], pulseMin: 0.05, pulseMax: 0.15, duration: 10000 },
  'deep-night': { colors: ['#0a0a2030', '#0a0a2000'], pulseMin: 0.1, pulseMax: 0.2, duration: 12000 },
  rain:       { colors: ['#4a6a8820', '#4a6a8800'], pulseMin: 0.08, pulseMax: 0.22, duration: 5000 },
};

interface AmbientLightProps {
  variant: TimeOfDay;
}

export function AmbientLight({ variant }: AmbientLightProps) {
  const cfg = AMBIENT[variant] ?? AMBIENT.day;
  const opacity = useSharedValue(cfg.pulseMin);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(cfg.pulseMax, { duration: cfg.duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(cfg.pulseMin, { duration: cfg.duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [opacity, cfg.pulseMin, cfg.pulseMax, cfg.duration]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]} pointerEvents="none">
      <LinearGradient
        colors={cfg.colors as [string, string]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}
