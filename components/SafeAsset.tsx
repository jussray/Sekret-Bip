/**
 * components/SafeAsset.tsx
 *
 * Guardrail 9 — Missing asset guardrail.
 *
 * Wraps <Image> so that if the source fails to load:
 *   1. The fallback card is shown instead (coloured placeholder).
 *   2. A console.warn is emitted with the asset name so we can track it.
 *   3. The app never crashes or shows a broken image icon.
 *
 * Usage:
 *   <SafeAsset
 *     source={require('../assets/images/bg-raylene-room-day.png')}
 *     style={styles.roomBg}
 *     assetName="bg-raylene-room-day"
 *     fallbackColor="#1a0a2e"
 *   />
 */

import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface Props {
  source: any;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  /** Human-readable name shown in the fallback card + logged on error. */
  assetName?: string;
  /** Background colour of the fallback card. Defaults to dark navy. */
  fallbackColor?: string;
  /** If true, use the same dimensions from style for the fallback card. */
  fillContainer?: boolean;
}

export function SafeAsset({
  source,
  style,
  resizeMode = 'cover',
  assetName = 'asset',
  fallbackColor = '#0d0820',
  fillContainer = false,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        style={[
          style as StyleProp<ViewStyle>,
          styles.fallback,
          { backgroundColor: fallbackColor },
          fillContainer && StyleSheet.absoluteFill,
        ]}
        accessibilityLabel={`Image unavailable: ${assetName}`}
      >
        <Text style={styles.fallbackEmoji}>🌙</Text>
        <Text style={styles.fallbackText}>Loading…</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        if (__DEV__) console.warn(`[SafeAsset] failed to load: ${assetName}`);
        setFailed(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  fallbackEmoji: { fontSize: 28, marginBottom: 6, opacity: 0.5 },
  fallbackText:  { fontSize: 11, color: 'rgba(180,160,220,0.5)' },
});
