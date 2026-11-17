/**
 * components/SyncBadge.tsx
 *
 * Guardrails 1 + 2 — Offline-first guardrail + Sync status product feature.
 *
 * Shows one of four states as a small pill the user can see:
 *   'local'   → "Saved on this device"
 *   'syncing' → "Syncing…"
 *   'synced'  → "Synced ✓"  (auto-hides after 3 s)
 *   'failed'  → "Sync failed — saved locally"
 *
 * Usage:
 *   import { SyncBadge } from '../components/SyncBadge';
 *   <SyncBadge status={syncStatus} />
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'failed' | 'idle';

interface Props {
  status: SyncStatus;
  /** Override the accent colour to match the screen's theme. Defaults to lavender. */
  color?: string;
}

const LABELS: Record<SyncStatus, string> = {
  idle:    '',
  local:   '📱 Saved on this device',
  syncing: '☁️ Syncing…',
  synced:  '✓ Synced',
  failed:  '⚠️ Sync failed — saved locally',
};

const BG: Record<SyncStatus, string> = {
  idle:    'transparent',
  local:   'rgba(120,80,200,0.18)',
  syncing: 'rgba(80,120,220,0.18)',
  synced:  'rgba(60,180,100,0.18)',
  failed:  'rgba(200,100,60,0.22)',
};

const BORDER: Record<SyncStatus, string> = {
  idle:    'transparent',
  local:   'rgba(150,100,220,0.35)',
  syncing: 'rgba(100,140,240,0.35)',
  synced:  'rgba(80,200,120,0.35)',
  failed:  'rgba(220,120,80,0.45)',
};

export function SyncBadge({ status, color }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(status !== 'idle');

  useEffect(() => {
    if (status === 'idle') {
      setVisible(false);
      return;
    }
    setVisible(true);
    opacity.setValue(1);

    if (status === 'synced') {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!visible || status === 'idle') return null;

  const textColor = color ?? '#c4b5fd';

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          opacity,
          backgroundColor: BG[status],
          borderColor: BORDER[status],
        },
      ]}
      accessibilityLabel={LABELS[status]}
      accessibilityRole="text"
    >
      <Text style={[styles.label, { color: textColor }]}>{LABELS[status]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf:       'center',
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderRadius:    20,
    borderWidth:     1,
    marginBottom:    8,
  },
  label: {
    fontSize:   11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
