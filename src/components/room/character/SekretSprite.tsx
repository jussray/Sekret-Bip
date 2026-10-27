/**
 * Renders a Se'kret companion according to its canonical runtime contract.
 * Legacy Raylene/Rylane keys remain compatibility aliases for Suhana/Sy.
 */
import React, { useEffect, useRef } from 'react';
import { Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  getCompanionRuntime,
  type CompanionRuntimeKey,
} from '@/config/companionRuntimeRegistry';

const { width: W } = Dimensions.get('window');

export type SekretMood = 'neutral' | 'happy' | 'sad' | 'anxious' | 'calm' | 'excited';

interface SekretSpriteProps {
  sekret: CompanionRuntimeKey;
  mood?: SekretMood;
  size?: number;
}

export function SekretSprite({ sekret, mood = 'neutral', size }: SekretSpriteProps) {
  const runtime = getCompanionRuntime(sekret);
  const resolvedSize = size ?? W * runtime.baseScale;
  const prevMood = useRef<SekretMood>(mood);
  const bobY = useSharedValue(0);

  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(-runtime.motion.idleAmplitude, {
          duration: runtime.motion.idleDurationMs,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: runtime.motion.idleDurationMs,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
  }, [bobY, runtime.motion.idleAmplitude, runtime.motion.idleDurationMs]);

  const scale = useSharedValue(1);
  useEffect(() => {
    if (mood !== prevMood.current) {
      prevMood.current = mood;
      scale.value = withSequence(
        withSpring(1.08, { damping: 6, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 180 }),
      );
    }
  }, [mood, scale]);

  const spriteStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }, { scale: scale.value }],
  }));

  if (!runtime.available || !runtime.source) return null;

  return (
    <Animated.View style={spriteStyle} testID={`companion-${runtime.id}`}>
      <Image
        source={runtime.source}
        style={{ width: resolvedSize, height: resolvedSize / runtime.aspectRatio }}
        resizeMode="contain"
        accessibilityLabel={runtime.label}
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}
