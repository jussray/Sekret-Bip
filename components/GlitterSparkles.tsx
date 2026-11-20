// components/GlitterSparkles.tsx
//
// Old-internet "customize your page" energy — a scattered field of twinkling
// emoji sparkles. Purely decorative, pointerEvents="none", safe to layer over
// any screen. No external assets; renders from a short glyph set so it stays
// on-brand with the app's existing emoji-based icon system.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const GLYPHS = ['✨', '💫', '⭐', '🌟', '💖', '💜'];

type Sparkle = { x: number; y: number; glyph: string; delay: number; duration: number; size: number };

function seedSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    x: ((i * 53 + 7) % 100) / 100,
    y: ((i * 89 + 23) % 100) / 100,
    glyph: GLYPHS[i % GLYPHS.length],
    delay: (i * 137) % 1800,
    duration: 1400 + ((i * 211) % 1200),
    size: 12 + ((i * 7) % 10),
  }));
}

function Twinkle({ sparkle }: { sparkle: Sparkle }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(sparkle.delay),
        Animated.timing(anim, { toValue: 1, duration: sparkle.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: sparkle.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, sparkle.delay, sparkle.duration]);

  return (
    <Animated.Text
      style={[
        styles.glyph,
        {
          left: `${sparkle.x * 100}%`,
          top: `${sparkle.y * 100}%`,
          fontSize: sparkle.size,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }],
        },
      ]}
    >
      {sparkle.glyph}
    </Animated.Text>
  );
}

export function GlitterSparkles({ count = 16 }: { count?: number }) {
  const sparkles = useMemo(() => seedSparkles(count), [count]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {sparkles.map((sp, i) => (
        <Twinkle key={i} sparkle={sp} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: { position: 'absolute' },
});
