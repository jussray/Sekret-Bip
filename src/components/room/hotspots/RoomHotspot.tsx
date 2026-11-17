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
  Easing,
} from 'react-native-reanimated';

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
  const labelOpacity = useSharedValue(0);

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

  const handlePress = () => {
    onPress?.();
    if (label) {
      setShowLabel(true);
    }
  };

  const left = W * x - width  / 2;
  const top  = H * y - height / 2;

  return (
    <View style={[styles.root, { left, top, width, height }]}>
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
