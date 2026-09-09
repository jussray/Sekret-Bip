import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

import { FRONT_DOOR_MOTION } from '@/motion/frontDoorMotion';
import { FRONT_DOOR_THEME } from '@/constants/frontDoorTheme';

type ArrivalState = 'entering' | 'settled' | 'reduced';

function prefersReducedMotionOnFirstFrame(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FrontDoorSceneArrival({ children }: PropsWithChildren) {
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotionOnFirstFrame);
  const [arrivalState, setArrivalState] = useState<ArrivalState>(() => (
    prefersReducedMotionOnFirstFrame() ? 'reduced' : 'entering'
  ));
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setReduceMotion(true);
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.('change', update);

    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    progress.stopAnimation();

    if (reduceMotion) {
      progress.setValue(1);
      setArrivalState('reduced');
      return;
    }

    progress.setValue(0);
    setArrivalState('entering');
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: FRONT_DOOR_MOTION.arrivalDurationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) setArrivalState('settled');
    });

    return () => animation.stop();
  }, [progress, reduceMotion]);

  const sceneStyle = reduceMotion
    ? styles.settled
    : {
        opacity: progress.interpolate({
          inputRange: [0, 1],
          outputRange: FRONT_DOOR_MOTION.arrivalOpacity,
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: FRONT_DOOR_MOTION.arrivalTranslateY,
            }),
          },
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: FRONT_DOOR_MOTION.arrivalScale,
            }),
          },
        ],
      };

  const primerStyle = reduceMotion
    ? styles.primerReduced
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.08, 0.72, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 0.18, 1],
              outputRange: [8, 0, -5],
            }),
          },
        ],
      };

  const youStyle = reduceMotion
    ? styles.primerStepReduced
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.06, 0.24, 0.88, 1],
          outputRange: [0, 1, 1, 1, 0],
        }),
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 0.12, 1],
              outputRange: [0.9, 1, 1],
            }),
          },
        ],
      };

  const spaceStyle = reduceMotion
    ? styles.primerStepReduced
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.18, 0.36, 0.88, 1],
          outputRange: [0, 0, 1, 1, 0],
        }),
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 0.24, 0.4, 1],
              outputRange: [0.9, 0.9, 1, 1],
            }),
          },
        ],
      };

  const enterStyle = reduceMotion
    ? styles.primerStepReduced
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.34, 0.52, 0.88, 1],
          outputRange: [0, 0, 1, 1, 0],
        }),
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 0.4, 0.56, 1],
              outputRange: [0.9, 0.9, 1, 1],
            }),
          },
        ],
      };

  return (
    <Animated.View
      testID="web-welcome-scene-arrival"
      accessibilityLabel="Se'kret Bip welcome scene"
      accessibilityState={{ busy: arrivalState === 'entering' }}
      accessibilityValue={{ text: arrivalState }}
      style={[styles.scene, sceneStyle]}
    >
      {arrivalState === 'entering' ? (
        <Animated.View
          testID="web-welcome-caveman-visual"
          pointerEvents="none"
          accessible
          accessibilityLabel="You. Your space. Enter."
          style={[styles.primer, primerStyle]}
        >
          <Animated.View style={[styles.primerCard, youStyle]}>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerGlyph}
            >
              ◉
            </Animated.Text>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerLabel}
            >
              YOU
            </Animated.Text>
          </Animated.View>

          <Animated.Text
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.primerArrow}
          >
            →
          </Animated.Text>

          <Animated.View style={[styles.primerCard, spaceStyle]}>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerGlyph}
            >
              ☾
            </Animated.Text>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerLabel}
            >
              YOUR SPACE
            </Animated.Text>
          </Animated.View>

          <Animated.Text
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.primerArrow}
          >
            →
          </Animated.Text>

          <Animated.View style={[styles.primerCard, styles.primerCardStrong, enterStyle]}>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerGlyphStrong}
            >
              ✦
            </Animated.Text>
            <Animated.Text
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.primerLabelStrong}
            >
              ENTER
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      ) : null}

      {arrivalState !== 'entering' ? (
        <Animated.View
          testID="web-welcome-scene-settled"
          accessible={false}
          pointerEvents="none"
          style={styles.stateMarker}
        />
      ) : null}

      {children}
    </Animated.View>
  );
}

const { color, RADIUS, SPACE, TYPE } = FRONT_DOOR_THEME;

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  settled: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  primer: {
    position: 'absolute',
    zIndex: 20,
    top: SPACE[3],
    left: SPACE[4],
    right: SPACE[4],
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE[1.5],
  },
  primerReduced: {
    opacity: 0,
    transform: [{ translateY: 0 }],
  },
  primerCard: {
    minWidth: 72,
    minHeight: 42,
    paddingHorizontal: SPACE[2.5],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE[1],
  },
  primerCardStrong: {
    borderColor: color.borderStrong,
    backgroundColor: color.shellRaised,
    boxShadow: FRONT_DOOR_THEME.shadow.action as never,
  },
  primerGlyph: {
    color: color.pinkLight,
    fontSize: TYPE.sm,
    fontWeight: '900',
  },
  primerGlyphStrong: {
    color: color.lilacLight,
    fontSize: TYPE.sm,
    fontWeight: '900',
  },
  primerLabel: {
    color: color.textMid,
    fontSize: TYPE.xs,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  primerLabelStrong: {
    color: color.textHigh,
    fontSize: TYPE.xs,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  primerStepReduced: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  primerArrow: {
    color: color.pinkLight,
    fontSize: TYPE.sm,
    fontWeight: '900',
  },
  stateMarker: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
