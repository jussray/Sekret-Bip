import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STAR_POINTS = [
  { top: '10%', left: '14%', size: 3, opacity: 0.55 },
  { top: '16%', left: '28%', size: 2, opacity: 0.38 },
  { top: '8%', left: '46%', size: 4, opacity: 0.62 },
  { top: '19%', right: '22%', size: 3, opacity: 0.48 },
  { top: '27%', right: '10%', size: 2, opacity: 0.36 },
  { top: '34%', left: '18%', size: 3, opacity: 0.42 },
] as const;

/**
 * Non-interactive atmosphere layer for the approved Se'kret Bip room canon.
 *
 * The illustrated room remains the product surface. This layer only unifies
 * moonlight, violet depth, subtle star shimmer, and lower-screen contrast.
 * It deliberately contains no buttons, cards, companion avatars, or labels.
 */
export function VisualCanonAtmosphere() {
  const shimmer = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.82,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.3,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View
      pointerEvents="none"
      testID="room-visual-canon-atmosphere"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(12, 4, 36, 0.46)',
          'rgba(48, 18, 82, 0.14)',
          'rgba(17, 7, 42, 0.06)',
          'rgba(8, 3, 24, 0.32)',
        ]}
        locations={[0, 0.24, 0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.moonGlow} />
      <View style={styles.moonDisc} />
      <View style={styles.moonCutout} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: shimmer }]}>
        {STAR_POINTS.map((star, index) => (
          <View
            key={index}
            style={[
              styles.star,
              star,
              { width: star.size, height: star.size, borderRadius: star.size / 2 },
            ]}
          />
        ))}
      </Animated.View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(9, 3, 28, 0)', 'rgba(9, 3, 28, 0.5)']}
        locations={[0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  moonGlow: {
    position: 'absolute',
    top: '7%',
    right: '7%',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(199, 171, 255, 0.09)',
  },
  moonDisc: {
    position: 'absolute',
    top: '9%',
    right: '10%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(239, 226, 255, 0.72)',
  },
  moonCutout: {
    position: 'absolute',
    top: '8.3%',
    right: '8.8%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(21, 8, 52, 0.92)',
  },
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(229, 209, 255, 0.92)',
    shadowColor: '#d8b4fe',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
});
