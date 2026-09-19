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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  id,
  x,
  y,
  width = 64,
  height = 64,
  label,
  onPress,
}: RoomHotspotProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [showLabel, setShowLabel] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labelOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0.96);
  const labelOffsetY = useSharedValue(6);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideLabel = useCallback(() => {
    clearHideTimer();
    labelOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
    labelScale.value = withSpring(0.96, {
      damping: 18,
      stiffness: 220,
      mass: 0.7,
    });
    labelOffsetY.value = withTiming(4, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });

    hideTimerRef.current = setTimeout(() => {
      setShowLabel(false);
      hideTimerRef.current = null;
    }, 190);
  }, [clearHideTimer, labelOffsetY, labelOpacity, labelScale]);

  const revealLabel = useCallback(() => {
    if (!label) return;

    clearHideTimer();
    setShowLabel(true);

    labelOpacity.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.ease),
    });
    labelScale.value = withSpring(1, {
      damping: 14,
      stiffness: 240,
      mass: 0.65,
    });
    labelOffsetY.value = withSpring(0, {
      damping: 16,
      stiffness: 220,
      mass: 0.7,
    });

    hideTimerRef.current = setTimeout(hideLabel, 2000);
  }, [clearHideTimer, hideLabel, label, labelOffsetY, labelOpacity, labelScale]);

  useEffect(() => () => {
    clearHideTimer();
    cancelAnimation(labelOpacity);
    cancelAnimation(labelScale);
    cancelAnimation(labelOffsetY);
  }, [clearHideTimer, labelOffsetY, labelOpacity, labelScale]);

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [
      { translateY: labelOffsetY.value },
      { scale: labelScale.value },
    ],
  }));

  const handlePress = () => {
    onPress?.();
    revealLabel();
  };

  const left = viewportWidth * x - width / 2;
  const top = viewportHeight * y - height / 2;

  return (
    <View
      testID={`room-hotspot-${id}`}
      style={[styles.root, { left, top, width, height }]}
    >
      <TouchableOpacity
        testID={`room-hotspot-${id}-button`}
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        activeOpacity={0.01}
        accessibilityLabel={label}
        accessibilityRole="button"
      />
      {showLabel && (
        <Animated.View
          testID={`room-hotspot-${id}-label`}
          pointerEvents="none"
          style={[styles.tooltip, labelStyle]}
        >
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
