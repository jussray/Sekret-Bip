/**
 * src/components/room/hotspots/RoomHotspot.tsx
 *
 * A single invisible touch zone placed over an area of the room.
 * Shows an optional floating label on press (auto-dismisses after 2s).
 *
 * Usage:
 *   <RoomHotspot
 *     id="lamp"
 *     x={0.72}   // 0–1 fraction of screen width
 *     y={0.18}   // 0–1 fraction of screen height
 *     width={80}
 *     height={80}
 *     label="Turn on lamp"
 *     onPress={() => setLampOn(true)}
 *   />
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../../../hooks/useReducedMotion';

const { width: W, height: H } = Dimensions.get('window');

export interface HotspotConfig {
  id: string;
  /** Fractional position 0–1 of the hotspot centre. */
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  onPress?: () => void;
}

type RoomHotspotProps = HotspotConfig;

export function RoomHotspot({
  x,
  y,
  width = 64,
  height = 64,
  label,
  onPress,
}: RoomHotspotProps) {
  const [showLabel, setShowLabel] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [discoveryWindowOpen, setDiscoveryWindowOpen] = useState(true);
  const labelOpacity = useSharedValue(0);
  const discoverPulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const hideLabel = useCallback(() => {
    labelOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    setTimeout(() => setShowLabel(false), 310);
  }, [labelOpacity]);

  useEffect(() => {
    if (showLabel) {
      labelOpacity.value = withTiming(1, { duration: 200 });
      // Auto-dismiss after 2s.
      const t = setTimeout(hideLabel, 2000);
      return () => clearTimeout(t);
    }
  }, [showLabel, labelOpacity, hideLabel]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  // #958: an interactive hotspot is otherwise a fully invisible touch zone —
  // a first-time user has no way to know it's there. A soft, bounded glow
  // invites discovery, then gets out of the way on its own (8s) even if
  // never pressed — never a persistent icon sitting on top of the room art.
  useEffect(() => {
    const t = setTimeout(() => setDiscoveryWindowOpen(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const showDiscoverCue = Boolean(onPress) && !hasInteracted && discoveryWindowOpen;

  useEffect(() => {
    if (!showDiscoverCue) {
      discoverPulse.value = withTiming(0, { duration: 200 });
      return;
    }
    if (reduceMotion) {
      // Static, non-animated cue — no unnecessary motion for reduced-motion users.
      discoverPulse.value = withTiming(0.5, { duration: 1 });
      return;
    }
    discoverPulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [showDiscoverCue, reduceMotion, discoverPulse]);

  const discoverStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + discoverPulse.value * 0.22,
    transform: [{ scale: 1 + discoverPulse.value * 0.06 }],
  }));

  const handlePress = () => {
    setHasInteracted(true);
    onPress?.();
    if (label) {
      setShowLabel(true);
    }
  };

  const left = W * x - width  / 2;
  const top  = H * y - height / 2;

  return (
    <View style={[styles.root, { left, top, width, height }]}>
      {showDiscoverCue && (
        <Animated.View
          style={[styles.discoverGlow, discoverStyle]}
          pointerEvents="none"
        />
      )}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        activeOpacity={0.01}
        accessibilityLabel={label}
        accessibilityRole="button"
      />
      {showLabel && (
        <Animated.View style={[styles.tooltip, labelStyle]}>
          <Text style={styles.tooltipText}>{label}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    zIndex: 10,
  },
  discoverGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tooltip: {
    position: 'absolute',
    bottom: '110%',
    alignSelf: 'center',
    backgroundColor: 'rgba(20,20,30,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 80,
  },
  tooltipText: {
    color: '#f0eee8',
    fontSize: 12,
    textAlign: 'center',
  },
});
