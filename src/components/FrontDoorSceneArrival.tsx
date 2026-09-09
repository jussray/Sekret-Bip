import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { FRONT_DOOR_MOTION } from '@/motion/frontDoorMotion';
import { FRONT_DOOR_THEME } from '@/constants/frontDoorTheme';

type ArrivalState = 'entering' | 'settled' | 'reduced';
type StageMode = 'pending' | 'teen' | 'other';

const TEEN_FAMILY_HERO = require('../../assets/brand/sekret-bip-teen-family-v1.jpg');
const NIGHT_HERO = require('../../assets/images/companions/teen/night/neutral.png');
const SUHANA_HERO = require('../../assets/images/companions/teen/raylene/neutral.png');
const SY_HERO = require('../../assets/images/companions/teen/rylane/neutral.png');
const CLOUD_HERO = require('../../assets/images/cloud.png');

function prefersReducedMotionOnFirstFrame(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FrontDoorSceneArrival({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotionOnFirstFrame);
  const [stageMode, setStageMode] = useState<StageMode>(() => (
    prefersReducedMotionOnFirstFrame() ? 'other' : 'pending'
  ));
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
      setStageMode('other');
      setArrivalState('reduced');
      return;
    }

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      progress.setValue(1);
      setStageMode('other');
      setArrivalState('settled');
      return;
    }

    let animation: Animated.CompositeAnimation | null = null;
    const frame = window.requestAnimationFrame(() => {
      const teenHero = document.querySelector('[data-testid="web-welcome-hero-teen"]');

      if (!teenHero) {
        progress.setValue(1);
        setStageMode('other');
        setArrivalState('settled');
        return;
      }

      setStageMode('teen');
      setArrivalState('entering');
      progress.setValue(0);

      animation = Animated.timing(progress, {
        toValue: 1,
        duration: FRONT_DOOR_MOTION.photoBlockingDurationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

      animation.start(({ finished }) => {
        if (finished) setArrivalState('settled');
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      animation?.stop();
    };
  }, [progress, reduceMotion]);

  const compact = width < 520;
  const shortViewport = compact && height < 700;
  const stageWidth = Math.min(width, 430);
  const stageHeight = shortViewport
    ? FRONT_DOOR_THEME.heroSafeArea.teen.shortHeight
    : compact
      ? FRONT_DOOR_THEME.heroSafeArea.teen.compactHeight
      : FRONT_DOOR_THEME.heroSafeArea.teen.desktopHeight;
  const stageLeft = Math.max((width - stageWidth) / 2, 0);
  const stageTop = Math.max(220, Math.min(height * 0.3, 275));

  const veilStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.74, 1],
      outputRange: [1, 1, 0],
    }),
  };

  const parentsStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.04, 0.32, 0.88, 1],
      outputRange: [0, 0, 1, 1, 0],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 0.04, 0.34, 1],
          outputRange: [-82, -82, 0, 0],
        }),
      },
    ],
  };

  const nightStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.06, 0.42, 0.9, 1],
      outputRange: [0, 0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 0.06, 0.46, 1],
          outputRange: [-118, -118, 0, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 0.3, 0.46, 1],
          outputRange: [0.96, 0.96, 1, 1],
        }),
      },
    ],
  };

  const syStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.12, 0.48, 0.9, 1],
      outputRange: [0, 0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 0.12, 0.52, 1],
          outputRange: [118, 118, 0, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 0.34, 0.52, 1],
          outputRange: [0.96, 0.96, 1, 1],
        }),
      },
    ],
  };

  const suhanaStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.18, 0.54, 0.9, 1],
      outputRange: [0, 0, 1, 1, 0],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 0.18, 0.58, 1],
          outputRange: [76, 76, 0, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 0.18, 0.48, 0.58, 1],
          outputRange: [0.94, 0.94, 1.025, 1, 1],
        }),
      },
    ],
  };

  const cloudStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 0.32, 0.64, 0.92, 1],
      outputRange: [0, 0, 1, 1, 0],
    }),
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 0.32, 0.68, 1],
          outputRange: [92, 92, 0, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 0.4, 0.64, 1],
          outputRange: [0.9, 0.9, 1, 1],
        }),
      },
    ],
  };

  const stagingVisible = !reduceMotion
    && stageMode !== 'other'
    && arrivalState === 'entering';

  return (
    <View
      testID="web-welcome-scene-arrival"
      accessibilityLabel="Se'kret Bip welcome scene"
      accessibilityState={{ busy: arrivalState === 'entering' }}
      accessibilityValue={{ text: arrivalState }}
      style={styles.scene}
    >
      {children}

      {stagingVisible ? (
        <View
          testID="web-welcome-photo-blocking"
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.stageFrame,
            {
              width: stageWidth,
              height: stageHeight,
              left: stageLeft,
              top: stageTop,
            },
          ]}
        >
          <Animated.View style={[styles.stageVeil, veilStyle]} />

          {stageMode === 'teen' ? (
            <>
              <Animated.View
                testID="web-welcome-stage-parents"
                style={[
                  styles.parentsCrop,
                  {
                    width: stageWidth * 0.76,
                    height: stageHeight * 0.34,
                    left: stageWidth * 0.12,
                    top: 0,
                  },
                  parentsStyle,
                ]}
              >
                <Image
                  source={TEEN_FAMILY_HERO}
                  resizeMode="contain"
                  style={{
                    position: 'absolute',
                    width: stageWidth,
                    height: stageHeight,
                    left: -stageWidth * 0.12,
                    top: 0,
                  }}
                />
              </Animated.View>

              <Animated.View
                testID="web-welcome-stage-night"
                style={[
                  styles.characterSlot,
                  {
                    width: stageWidth * 0.31,
                    height: stageHeight * 0.66,
                    left: stageWidth * 0.05,
                    bottom: stageHeight * 0.02,
                  },
                  nightStyle,
                ]}
              >
                <Image source={NIGHT_HERO} resizeMode="contain" style={styles.characterImage} />
              </Animated.View>

              <Animated.View
                testID="web-welcome-stage-suhana"
                style={[
                  styles.characterSlot,
                  styles.suhanaSlot,
                  {
                    width: stageWidth * 0.34,
                    height: stageHeight * 0.72,
                    left: stageWidth * 0.33,
                    bottom: stageHeight * 0.01,
                  },
                  suhanaStyle,
                ]}
              >
                <Image source={SUHANA_HERO} resizeMode="contain" style={styles.characterImage} />
              </Animated.View>

              <Animated.View
                testID="web-welcome-stage-sy"
                style={[
                  styles.characterSlot,
                  {
                    width: stageWidth * 0.31,
                    height: stageHeight * 0.66,
                    right: stageWidth * 0.05,
                    bottom: stageHeight * 0.02,
                  },
                  syStyle,
                ]}
              >
                <Image source={SY_HERO} resizeMode="contain" style={styles.characterImage} />
              </Animated.View>

              <Animated.View
                testID="web-welcome-stage-cloud"
                style={[
                  styles.cloudSlot,
                  {
                    width: stageWidth * 0.25,
                    height: stageWidth * 0.25,
                    left: stageWidth * 0.375,
                    bottom: -stageWidth * 0.01,
                  },
                  cloudStyle,
                ]}
              >
                <Image source={CLOUD_HERO} resizeMode="contain" style={styles.characterImage} />
              </Animated.View>
            </>
          ) : null}
        </View>
      ) : null}

      {arrivalState !== 'entering' ? (
        <View
          testID="web-welcome-scene-settled"
          accessible={false}
          pointerEvents="none"
          style={styles.stateMarker}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  stageFrame: {
    position: 'absolute',
    zIndex: 40,
    overflow: 'hidden',
  },
  stageVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D071E',
  },
  parentsCrop: {
    position: 'absolute',
    overflow: 'hidden',
  },
  characterSlot: {
    position: 'absolute',
    zIndex: 3,
  },
  suhanaSlot: {
    zIndex: 4,
  },
  cloudSlot: {
    position: 'absolute',
    zIndex: 5,
  },
  characterImage: {
    width: '100%',
    height: '100%',
  },
  stateMarker: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
