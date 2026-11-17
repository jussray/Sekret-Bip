import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  uri: string;
  tintColor?: string;
  progress?: number;  // 0–1
  onSeek?: (progress: number) => void;
  barCount?: number;
}

/**
 * Visual waveform bar display.
 * Generates pseudo-random bar heights seeded by the URI so bars are
 * stable across renders for the same recording.
 * Real waveform analysis can replace the seed function later.
 */
export default function WaveformPlayer({
  uri,
  tintColor = '#8B5CF6',
  progress = 0,
  onSeek,
  barCount = 40,
}: Props) {
  const bars = useMemo(() => {
    let seed = uri.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return Array.from({ length: barCount }, () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return 0.2 + (Math.abs(seed) / 0xffffffff) * 0.8;
    });
  }, [uri, barCount]);

  const handlePress = (index: number) => {
    onSeek?.((index + 1) / barCount);
  };

  return (
    <View style={styles.container}>
      {bars.map((height, i) => {
        const played = i / barCount < progress;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => handlePress(i)}
            style={[
              styles.bar,
              {
                height: `${height * 100}%` as any,
                backgroundColor: played ? tintColor : '#3d2060',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    gap: 2,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 3,
  },
});
