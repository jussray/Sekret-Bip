// components/PresenceAvatar.tsx
// Se'kret Bip — Voice Bip Presence System
//
// Renders the right avatar art for the current (character, time, state) cell
// and animates it with subtle state-specific motion. Cross-fades between
// states so transitions feel human, not stuttery.
//
// This component is intentionally dumb: it does no business logic, no audio,
// no networking. It only knows how to look alive.

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  resolveAvatarAsset,
  STATE_MOTION,
  type PresenceCharacter,
  type PresenceState,
} from '../constants/presence/avatarStates';
import {
  PRESENCE_TINT,
  type PresenceTime,
} from '../constants/presence/timeOfDay';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { PRESENCE_MOTION } from '../src/motion/presenceMotion';

export type PresenceAvatarProps = {
  character: PresenceCharacter;
  time: PresenceTime;
  /** Current presence state. 'idle' is rendered as comforting-at-rest. */
  state: PresenceState | 'idle';
  /** Container style for positioning inside the room. */
  style?: StyleProp<ViewStyle>;
  /** Image-level style override (size, alignment). */
  imageStyle?: StyleProp<ImageStyle>;
  /** Optional override for the tint overlay (defaults to PRESENCE_TINT[time]). */
  tintColor?: string;
  /** When false, the avatar holds still (useful in screenshots / tests). */
  animate?: boolean;
};

/** Normalize 'idle' to its visual equivalent. */
function effectiveState(s: PresenceState | 'idle'): PresenceState {
  return s === 'idle' ? 'comforting' : s;
}

export function PresenceAvatar(props: PresenceAvatarProps) {
  const {
    character,
    time,
    state,
    style,
    imageStyle,
    tintColor,
    animate = true,
  } = props;

  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;
  const visualState = effectiveState(state);
  const asset = resolveAvatarAsset(character, time, visualState);
  const motion = STATE_MOTION[visualState];

  // Two stacked layers so we can cross-fade between asset swaps instead of
  // hard-cutting. `current` holds the live asset; `previous` fades out.
  const prevAsset = useRef<any>(asset);
  const fadeIn = useRef(new Animated.Value(1)).current;
  const fadeOut = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prevAsset.current === asset) return;

    fadeIn.stopAnimation();
    fadeOut.stopAnimation();

    if (!shouldAnimate) {
      prevAsset.current = asset;
      fadeIn.setValue(1);
      fadeOut.setValue(0);
      return;
    }

    fadeIn.setValue(0);
    fadeOut.setValue(1);
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: PRESENCE_MOTION.stateCrossfadeMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: PRESENCE_MOTION.stateCrossfadeMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) prevAsset.current = asset;
    });
  }, [asset, fadeIn, fadeOut, shouldAnimate]);

  // State-specific breath / motion loop.
  const motionAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    motionAnim.stopAnimation();
    motionAnim.setValue(0);
    if (!shouldAnimate) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motionAnim, {
          toValue: 1,
          duration: motion.durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(motionAnim, {
          toValue: 0,
          duration: motion.durationMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [motion.durationMs, motionAnim, shouldAnimate, visualState]);

  const motionTransform = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.scaleFrom, motion.scaleTo],
  });
  const motionOpacity = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.opacityFrom, motion.opacityTo],
  });
  const transform = [{ scale: shouldAnimate ? motionTransform : 1 }];
  const liveOpacity = shouldAnimate
    ? Animated.multiply(fadeIn, motionOpacity)
    : fadeIn;

  const tint = tintColor ?? PRESENCE_TINT[time];

  return (
    <View
      testID="voice-presence-avatar"
      style={[styles.root, style]}
      pointerEvents="none"
    >
      {/* Previous asset (fading out during state transitions) */}
      <Animated.Image
        source={prevAsset.current}
        resizeMode="contain"
        style={[
          styles.layer,
          imageStyle,
          { opacity: shouldAnimate ? fadeOut : 0, transform },
        ]}
      />
      {/* Current asset (fading in) */}
      <Animated.Image
        testID="voice-presence-avatar-live"
        source={asset}
        resizeMode="contain"
        style={[
          styles.layer,
          imageStyle,
          { opacity: liveOpacity, transform },
        ]}
      />
      {/* Time-of-day tint overlay */}
      {tint !== 'rgba(255,236,189,0.00)' && (
        <View
          style={[styles.tint, { backgroundColor: tint }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', width: '100%', height: '100%' },
  layer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tint: StyleSheet.absoluteFill,
});
