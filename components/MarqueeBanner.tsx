// components/MarqueeBanner.tsx
//
// Old-internet scrolling marquee banner — the "profile song" bar,
// reinterpreted here as a scrolling mood/vibe line. Pure Animated.View
// translateX loop, no native marquee dependency.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ColorValue } from 'react-native';

interface MarqueeBannerProps {
  text: string;
  accent?: ColorValue;
  background?: ColorValue;
}

export function MarqueeBanner({ text, accent = '#c4b5fd', background = 'rgba(196,181,253,0.10)' }: MarqueeBannerProps) {
  const scroll = useRef(new Animated.Value(0)).current;
  const repeated = `${text}    ✦    ${text}    ✦    ${text}    ✦    `;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scroll, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [scroll]);

  const translateX = scroll.interpolate({ inputRange: [0, 1], outputRange: [0, -400] });

  return (
    <View style={[styles.wrap, { backgroundColor: background, borderColor: accent }]}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
        <Text style={[styles.text, { color: accent }]}>{repeated}</Text>
        <Text style={[styles.text, { color: accent }]}>{repeated}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
});
