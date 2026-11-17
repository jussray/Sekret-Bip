// components/RetroFrame.tsx
//
// Chunky dashed double-border card chrome — the "under construction" /
// webring era look, reframed as a friendly decorative frame for
// self-expression surfaces (Profile customization, Room stickers, Circle
// bulletin posts).

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle, type ColorValue } from 'react-native';

interface RetroFrameProps {
  children: React.ReactNode;
  accent?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

export function RetroFrame({ children, accent = '#c4b5fd', style }: RetroFrameProps) {
  return (
    <View style={[styles.outer, { borderColor: accent }, style]}>
      <View style={[styles.inner, { borderColor: accent }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 4,
  },
  inner: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
